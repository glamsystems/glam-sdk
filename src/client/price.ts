import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { KaminoLendingClient } from "./kamino";

import { BaseClient } from "./base";

import { ASSETS_MAINNET, SOL_ORACLE } from "./assets";
import {
  fetchStakeAccounts,
  fetchMarinadeTicketAccounts,
  fetchMeteoraPositions,
  parseMeteoraPosition,
  fetchKaminoObligations,
} from "../utils/helpers";
import { PriceDenom } from "../models";
import { KAMINO_SCOPE_PRICES } from "../constants";
import { DriftClient } from "./drift";

export class PriceClient {
  public constructor(
    readonly base: BaseClient,
    readonly klend: KaminoLendingClient,
    readonly drift: DriftClient,
  ) {}

  /**
   * !! This is a convenience method that calculates the AUM of the vault based on priced assets.
   * !! It doesn't reflect the actual AUM of the vault.
   * !! If the vault has not been priced or pricing data is outdated, the number is NOT meaningful.
   */
  public async getAum(glamState: PublicKey) {
    // @ts-ignore
    const glamStateAccount = await this.base.fetchStateAccount(glamState);
    let pricedAssets = [] as any[];
    glamStateAccount.params[0].forEach((param) => {
      const name = Object.keys(param.name)[0];
      if (name === "pricedAssets") {
        // @ts-ignore
        pricedAssets = Object.values(param.value)[0].val;
      }
    });
    return pricedAssets.reduce(
      (sum, p) => new BN(p.amount).add(sum),
      new BN(0),
    ) as BN;
  }

  async priceKaminoIx(glamState: PublicKey, priceDenom: PriceDenom) {
    const glamVault = this.base.getVaultPda(glamState);
    const obligations = await fetchKaminoObligations(
      this.base.provider.connection,
      glamVault,
    );
    const parsedObligations = await Promise.all(
      obligations.map((o) => this.klend.fetchAndParseObligation(o)),
    );
    const pubkeySet = new Set<string>([]);
    parsedObligations
      .filter((o) => o.lendingMarket !== null)
      .map((o) => {
        pubkeySet.add(o.address.toBase58());
        pubkeySet.add(o.lendingMarket!.toBase58());
        o.deposits.forEach((d) => pubkeySet.add(d.reserve.toBase58()));
        o.borrows.forEach((b) => pubkeySet.add(b.reserve.toBase58()));
      });
    const remainingAccounts = Array.from(pubkeySet).map((k) => ({
      pubkey: new PublicKey(k),
      isSigner: false,
      isWritable: true,
    }));

    // @ts-ignore
    const priceIx = await this.base.program.methods
      .priceKaminoObligations(priceDenom)
      .accounts({
        glamState,
        solOracle: SOL_ORACLE,
        pythOracle: null,
        switchboardPriceOracle: null,
        switchboardTwapOracle: null,
        scopePrices: KAMINO_SCOPE_PRICES,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return priceIx;
  }

  public async priceVaultIxs(
    glamState: PublicKey,
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction[]> {
    const vault = this.base.getVaultPda(glamState);

    const tickets = await fetchMarinadeTicketAccounts(
      this.base.provider.connection,
      vault,
    );
    // @ts-ignore
    const priceTicketsIx = await this.base.program.methods
      .priceTickets(priceDenom)
      .accounts({
        glamState,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(
        tickets.map((t) => ({
          pubkey: t.pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .instruction();

    const stakes = await fetchStakeAccounts(
      this.base.provider.connection,
      vault,
    );
    const priceStakesIx = await this.base.program.methods
      .priceStakes(priceDenom)
      .accounts({
        glamState,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(
        stakes.map((s) => ({
          pubkey: s,
          isSigner: false,
          isWritable: false,
        })),
      )
      .instruction();

    const priceVaultIx = await this.base.program.methods
      .priceVault(priceDenom)
      .accounts({
        glamState,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(
        await this.remainingAccountsForPricingVaultAssets(glamState),
      )
      .instruction();

    const priceMeteoraIx = await this.base.program.methods
      .priceMeteoraPositions(priceDenom)
      .accounts({
        glamState,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(
        await this.remainingAccountsForPricingMeteora(glamState),
      )
      .instruction();

    const priceKaminoIx = await this.priceKaminoIx(glamState, priceDenom);

    const { user, userStats } = this.drift.getDriftUserPdas(glamState);
    const remainingAccounts = await this.drift.composeRemainingAccounts(
      glamState,
      0,
    );

    const glamVault = this.base.getVaultPda(glamState);
    const priceDriftIx = await this.base.program.methods
      .priceDrift(priceDenom)
      .accounts({
        glamState,
        glamVault,
        solOracle: SOL_ORACLE,
        user,
        userStats,
        state: this.drift.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return [
      priceTicketsIx,
      priceStakesIx,
      priceVaultIx,
      priceMeteoraIx,
      priceKaminoIx,
      priceDriftIx,
    ];
  }

  remainingAccountsForPricingMeteora = async (glamState: PublicKey) => {
    const glamVault = this.base.getVaultPda(glamState);
    const positions = await fetchMeteoraPositions(
      this.base.provider.connection,
      glamVault,
    );

    let chunks = await Promise.all(
      positions.map(async (pubkey) => {
        const { lbPair, binArrayLower, binArrayUpper } =
          await parseMeteoraPosition(this.base.provider.connection, pubkey);

        return [
          pubkey,
          lbPair,
          binArrayLower,
          binArrayUpper,
          new PublicKey("3m6i4RFWEDw2Ft4tFHPJtYgmpPe21k56M3FHeWYrgGBz"),
          new PublicKey("9VCioxmni2gDLv11qufWzT3RDERhQE4iY5Gf7NTfYyAV"),
        ].map((k) => ({
          pubkey: k,
          isSigner: false,
          isWritable: false,
        }));
      }),
    );
    return chunks.flat();
  };

  remainingAccountsForPricingVaultAssets = async (glamState: PublicKey) => {
    const glamStateAccount = await this.base.fetchStateAccount(glamState);
    return glamStateAccount.assets
      .map((asset) => [
        this.base.getVaultAta(glamState, asset),
        asset,
        // FIXME: check oracle vs LST state?
        ASSETS_MAINNET.get(asset.toBase58())?.oracle || new PublicKey(0),
      ])
      .flat()
      .map((a) => ({
        pubkey: a,
        isSigner: false,
        isWritable: false,
      }));
  };
}
