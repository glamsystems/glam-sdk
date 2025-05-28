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
  public async getAum() {
    console.warn(
      "getAum() should only be used for testing. It doesn't reflect the actual AUM of the vault in production.",
    );

    // @ts-ignore
    const stateModel = await this.base.fetchStateModel();
    return (stateModel?.pricedAssets || []).reduce(
      (sum, p) => new BN(p.amount).add(sum),
      new BN(0),
    ) as BN;
  }

  async priceKaminoIx(priceDenom: PriceDenom) {
    const glamVault = this.base.vaultPda;
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
        glamState: this.base.statePda,
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
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction[]> {
    const glamVault = this.base.vaultPda;

    const priceVaultIx = await this.base.program.methods
      .priceVault(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(
        await this.remainingAccountsForPricingVaultAssets(
          priceDenom == PriceDenom.ASSET,
        ),
      )
      .instruction();

    // If priceDenom is ASSET, only priceVaultIx is returned
    // We currently don't support pricing other assets in custom base asset
    if (priceDenom == PriceDenom.ASSET) {
      return [priceVaultIx];
    }

    const tickets = await fetchMarinadeTicketAccounts(
      this.base.provider.connection,
      glamVault,
    );
    // @ts-ignore
    const priceTicketsIx = await this.base.program.methods
      .priceTickets(priceDenom)
      .accounts({
        glamState: this.base.statePda,
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
      glamVault,
    );
    const priceStakesIx = await this.base.program.methods
      .priceStakes(priceDenom)
      .accounts({
        glamState: this.base.statePda,
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

    const priceMeteoraIx = await this.base.program.methods
      .priceMeteoraPositions(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(await this.remainingAccountsForPricingMeteora())
      .instruction();

    const priceKaminoIx = await this.priceKaminoIx(priceDenom);

    try {
      const { user, userStats } = this.drift.getDriftUserPdas();
      const remainingAccounts = await this.drift.composeRemainingAccounts(0);
      const priceDriftIx = await this.base.program.methods
        .priceDrift(priceDenom)
        .accounts({
          glamState: this.base.statePda,
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
    } catch (error) {
      // Drift user not found, skip priceDriftIx
      return [
        priceTicketsIx,
        priceStakesIx,
        priceVaultIx,
        priceMeteoraIx,
        priceKaminoIx,
      ];
    }
  }

  remainingAccountsForPricingMeteora = async () => {
    const glamVault = this.base.vaultPda;
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

  remainingAccountsForPricingVaultAssets = async (
    baseAssetOnly: boolean = false,
  ) => {
    const stateModel = await this.base.fetchStateModel();
    if (baseAssetOnly) {
      if (!stateModel.baseAsset) {
        throw new Error("Base asset not configured for the vault");
      }
      // FIXME: support token 2022 base asset
      const ata = this.base.getVaultAta(stateModel.baseAsset);
      // Set oracle to default pubkey (aka system program) to indicate oracle isn't needed
      return [ata, stateModel.baseAsset, PublicKey.default].map((k) => ({
        pubkey: k,
        isSigner: false,
        isWritable: false,
      }));
    }

    const assetsForPricing = (stateModel.borrowableAssets || []).concat(
      stateModel.assets || [],
    );
    return assetsForPricing
      .map((mint) => {
        const assetMeta = ASSETS_MAINNET.get(mint.toBase58());
        if (!assetMeta) {
          throw new Error(`Asset meta not found for ${mint}`);
        }
        const ata = this.base.getVaultAta(mint, assetMeta?.programId);
        return [ata, mint, assetMeta?.oracle!];
      })
      .flat()
      .map((a) => ({
        pubkey: a,
        isSigner: false,
        isWritable: false,
      }));
  };
}
