import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { KaminoLendingClient, KaminoVaultsClient } from "./kamino";

import { BaseClient } from "./base";

import { ASSETS_MAINNET, SOL_ORACLE, USDC_ORACLE } from "./assets";
import {
  findStakeAccounts,
  fetchMeteoraPositions,
  parseMeteoraPosition,
} from "../utils/helpers";
import { PriceDenom } from "../models";
import { KAMINO_SCOPE_PRICES } from "../constants";
import { DriftClient, DriftVaultsClient } from "./drift";

export class PriceClient {
  public constructor(
    readonly base: BaseClient,
    readonly klend: KaminoLendingClient,
    readonly kvaults: KaminoVaultsClient,
    readonly drift: DriftClient,
    readonly dvaults: DriftVaultsClient,
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

    const stateModel = await this.base.fetchStateModel();
    return (stateModel?.pricedAssets || []).reduce(
      (sum, p) => new BN(p.amount).add(sum),
      new BN(0),
    ) as BN;
  }

  /**
   * Returns an instruction that prices Kamino obligations.
   * If there are no Kamino obligations, returns null.
   */
  async priceKaminoObligationsIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    const parsedObligations = await this.klend.findAndParseObligations(
      this.base.vaultPda,
    );

    if (parsedObligations.length === 0) {
      return null;
    }

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

  public async priceKaminoVaultSharesIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    const allKvaultStates = await this.kvaults.findAndParseKaminoVaults();
    const allKvaultMints = allKvaultStates.map((kvault) => kvault.sharesMint);

    // All share token accounts GLAM vault could possibly hold
    const possibleShareAtas = allKvaultMints.map((mint) =>
      this.base.getVaultAta(mint),
    );
    const possibleShareAtaAccountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(
        possibleShareAtas,
      );
    const shareAtas: typeof possibleShareAtas = [];
    const shareMints: typeof allKvaultMints = [];
    const kvaultStates: typeof allKvaultStates = [];
    possibleShareAtaAccountsInfo.forEach((info, i) => {
      if (info !== null) {
        shareAtas.push(possibleShareAtas[i]);
        shareMints.push(allKvaultMints[i]);
        kvaultStates.push(allKvaultStates[i]);
      }
    });
    const kvaultPdas = await this.kvaults.getVaultPdasByShareMints(shareMints);

    const remainingAccounts = (
      await Promise.all(
        kvaultStates.map((kvault) => {
          return this.kvaults.composeRemainingAccounts(
            kvault.vaultAllocationStrategy.filter(
              (alloc) => !alloc.reserve.equals(PublicKey.default),
            ),
          );
        }),
      )
    ).flat();
    [...kvaultPdas, ...shareAtas].map((pubkey) => {
      remainingAccounts.unshift({
        pubkey: pubkey!,
        isSigner: false,
        isWritable: false,
      });
    });

    const priceIx = await this.base.program.methods
      .priceKaminoVaultShares(priceDenom)
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

  /**
   * Returns an instruction that prices the all Drift users (aka sub-accounts) controlled by the GLAM vault.
   * These Drift users must share the same user_stats that's also controlled by the GLAM vault.
   */
  public async priceDriftUsersIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    // FIXME: check more users than #0
    const { user, userStats } = this.drift.getDriftUserPdas();
    try {
      const remainingAccounts = await this.drift.composeRemainingAccounts(0);
      const priceDriftUsersIx = await this.base.program.methods
        .priceDriftUsers(priceDenom)
        .accounts({
          glamState: this.base.statePda,
          solOracle: SOL_ORACLE,
        })
        .remainingAccounts([
          { pubkey: userStats, isSigner: false, isWritable: false },
          { pubkey: user, isSigner: false, isWritable: false },
          ...remainingAccounts,
        ])
        .instruction();

      return priceDriftUsersIx;
    } catch (error) {
      return null;
    }
  }

  /**
   * Returns an instruction that prices a drift vault depositor.
   * If there are no vault depositor accounts, returns null.
   */
  public async priceDriftVaultDepositorsIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    const parsedVaultDepositors =
      await this.dvaults.findAndParseVaultDepositors();

    if (parsedVaultDepositors.length === 0) {
      return null;
    }

    // For each vault deposit, we need the following pubkeys in remaining accounts:
    // - depositor
    // - drift vault
    // - drift user of the vault
    // - oracles
    // - spot & perp markets
    // There might be overlaps between markets and oracles so we use a set to avoid duplicates

    const remainingAccountsKeys = new Set<string>();
    for (const depositor of parsedVaultDepositors) {
      remainingAccountsKeys.add(depositor.address.toBase58());
      remainingAccountsKeys.add(depositor.driftVault.toBase58());
      const { user: driftUser } = await this.dvaults.parseDriftVault(
        depositor.driftVault,
      );
      remainingAccountsKeys.add(driftUser.toBase58());

      const markets_and_oracles = (
        await this.dvaults.composeRemainingAccounts(driftUser)
      ).map((a) => a.pubkey.toBase58());
      for (const k of markets_and_oracles) {
        remainingAccountsKeys.add(k);
      }
    }

    const remainingAccounts = Array.from(remainingAccountsKeys).map((k) => ({
      pubkey: new PublicKey(k),
      isSigner: false,
      isWritable: false,
    }));

    const priceIx = await this.base.program.methods
      .priceDriftVaultDepositors(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return priceIx;
  }

  /**
   * Returns an instruction that prices vault balance and tokens the vault holds
   */
  async priceVaultIx(priceDenom: PriceDenom): Promise<TransactionInstruction> {
    const remainingAccounts = await this.remainingAccountsForPricingVaultAssets(
      priceDenom == PriceDenom.ASSET,
    );
    const priceVaultIx = await this.base.program.methods
      .priceVault(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    return priceVaultIx;
  }

  /**
   * Returns an instruction that prices stake accounts.
   * If there are no stake accounts, returns null.
   */
  async priceStakesIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    const stakes = await findStakeAccounts(
      this.base.provider.connection,
      this.base.vaultPda,
    );
    if (stakes.length === 0) {
      return null;
    }
    const priceStakesIx = await this.base.program.methods
      .priceStakes(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(
        stakes.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .instruction();
    return priceStakesIx;
  }

  /**
   * Returns an instruction that prices Meteora positions.
   * If there are no Meteora positions, returns null.
   */
  async priceMeteoraPositionsIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    const remainingAccounts = await this.remainingAccountsForPricingMeteora();
    if (remainingAccounts.length === 0) {
      return null;
    }
    const priceMeteoraIx = await this.base.program.methods
      .priceMeteoraPositions(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    return priceMeteoraIx;
  }

  public async priceVaultIxs(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction[]> {
    const priceVaultIx = await this.priceVaultIx(priceDenom);

    // If priceDenom is ASSET, only priceVaultIx is returned
    // We currently don't support pricing other assets in custom base asset
    // due to the lack of oracles
    if (priceDenom == PriceDenom.ASSET) {
      return [priceVaultIx];
    }

    // If there are no external assets, we don't need to price DeFi positions
    const stateModel = await this.base.fetchStateModel();
    if ((stateModel.externalVaultAccounts || []).length === 0) {
      return [priceVaultIx];
    }

    const priceStakesIx = await this.priceStakesIx(priceDenom);
    const priceMeteoraIx = await this.priceMeteoraPositionsIx(priceDenom);
    const priceKaminoIx = await this.priceKaminoObligationsIx(priceDenom);
    const priceDriftUsersIx = await this.priceDriftUsersIx(priceDenom);
    const priceDriftVaultDepositorsIx =
      await this.priceDriftVaultDepositorsIx(priceDenom);

    return [
      priceVaultIx,
      priceStakesIx,
      priceMeteoraIx,
      priceKaminoIx,
      priceDriftUsersIx,
      priceDriftVaultDepositorsIx,
    ].filter((ix) => ix !== null);
  }

  remainingAccountsForPricingMeteora = async () => {
    const positions = await fetchMeteoraPositions(
      this.base.provider.connection,
      this.base.vaultPda,
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
          SOL_ORACLE, // FIXME: token x oracle
          USDC_ORACLE, // FIXME: token y oracle
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
