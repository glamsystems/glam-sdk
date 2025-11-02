import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { KaminoLendingClient, KaminoVaultsClient } from "./kamino";

import { BaseClient, TxOptions } from "./base";

import { ASSETS_MAINNET, SOL_ORACLE, USDC_ORACLE } from "../assets";
import { findStakeAccounts } from "../utils/accounts";
import { fetchMeteoraPositions, parseMeteoraPosition } from "../utils/meteora";
import { StateModel } from "../models";
import { KAMINO_SCOPE_PRICES } from "../constants";
import { DriftClient, DriftUser, DriftVaultsClient } from "./drift";

export class PriceClient {
  private _stateModel: StateModel | null = null;
  private _lookupTables = new Set<string>();
  private _kaminoVaults = new Set<string>();

  public constructor(
    readonly base: BaseClient,
    readonly klend: KaminoLendingClient,
    readonly kvaults: KaminoVaultsClient,
    readonly drift: DriftClient,
    readonly dvaults: DriftVaultsClient,
  ) {}

  get cachedStateModel(): StateModel | null {
    if (!this._stateModel) {
      console.warn("State model not cached");
      return null;
    }
    return this._stateModel;
  }

  set cachedStateModel(stateModel: StateModel) {
    this._stateModel = stateModel;
  }

  get lookupTables() {
    return Array.from(this._lookupTables).map((k) => new PublicKey(k));
  }

  get kaminoVaults() {
    return Array.from(this._kaminoVaults).map((k) => new PublicKey(k));
  }

  /**
   * @deprecated
   *
   * Calculates the Assets Under Management (AUM) based on cached pricing data.
   *
   * @warning This is a convenience method for testing purposes only and should NOT be used in production.
   * @warning The returned value may be inaccurate if:
   *   - The vault has not been priced recently
   *   - Pricing data is stale or outdated
   *   - Not all assets have been included in the pricing calculation
   *
   * @returns The total AUM in the base asset denomination as a BN
   * @see priceVaultIxs() to update pricing data before calling this method
   */
  public async getAum() {
    console.warn(
      "getAum() should only be used for testing. It may not reflect the actual AUM of the vault.",
    );

    const stateModel =
      this.cachedStateModel || (await this.base.fetchStateModel());
    return (stateModel?.pricedProtocols || []).reduce(
      (sum, p) => new BN(p.amount).add(sum),
      new BN(0),
    ) as BN;
  }

  /**
   * Returns an instruction that prices Kamino obligations.
   * If there are no Kamino obligations, returns null.
   */
  async priceKaminoObligationsIxs(): Promise<TransactionInstruction[]> {
    const parsedObligations = await this.klend.findAndParseObligations(
      this.base.vaultPda,
    );
    if (parsedObligations.length === 0) {
      return [];
    }

    const ixs: TransactionInstruction[] = [];

    const obligationReservesMap: Map<string, Set<string>> = new Map();
    const reservesSet = new Set<string>();
    parsedObligations.map(({ address, deposits, borrows }) => {
      obligationReservesMap.set(address.toBase58(), new Set());
      deposits.forEach(({ reserve }) => {
        const reserveKey = reserve.toBase58();
        reservesSet.add(reserveKey);
        obligationReservesMap.get(address.toBase58())?.add(reserveKey);
      });
      borrows.forEach(({ reserve }) => {
        const reserveKey = reserve.toBase58();
        reservesSet.add(reserveKey);
        obligationReservesMap.get(address.toBase58())?.add(reserveKey);
      });
    });

    // Refresh reserves in batch
    const parsedReserves = await this.klend.fetchAndParseReserves(
      Array.from(reservesSet).map((k) => new PublicKey(k)),
    );
    ixs.push(this.klend.refreshReservesBatchIxV2(parsedReserves, false));

    // Refresh obligations
    parsedObligations.forEach(({ address, lendingMarket }) => {
      ixs.push(
        this.klend.refreshObligationIx({
          obligation: address,
          lendingMarket,
          reserves: Array.from(
            obligationReservesMap.get(address.toBase58()) || [],
          ).map((k) => new PublicKey(k)),
        }),
      );
    });

    const remainingAccounts = Array.from(obligationReservesMap.keys()).map(
      (pubkey) => ({
        pubkey: new PublicKey(pubkey),
        isSigner: false,
        isWritable: true,
      }),
    );

    const priceIx = await this.base.mintProgram.methods
      .priceKaminoObligations()
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
        baseAssetOracle: await this.getbaseAssetOracle(),
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    ixs.push(priceIx);

    return ixs;
  }

  public async priceKaminoVaultSharesIx(): Promise<
    TransactionInstruction[] | null
  > {
    const allKvaultStates = await this.kvaults.findAndParseKaminoVaults();
    const allKvaultMints = allKvaultStates.map((kvault) => kvault.sharesMint);

    // All kvaut share token accounts GLAM vault could possibly hold
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
    const oracles: PublicKey[] = []; // oracle of kvault deposit token
    possibleShareAtaAccountsInfo.forEach((info, i) => {
      // share ata must exist and it must be tracked by glam state
      // otherwise skip it for pricing
      if (
        info !== null &&
        this.cachedStateModel?.externalPositions?.find((a) =>
          a.equals(possibleShareAtas[i]),
        )
      ) {
        shareAtas.push(possibleShareAtas[i]);
        shareMints.push(allKvaultMints[i]);
        kvaultStates.push(allKvaultStates[i]);

        // get oracle and lookup table from kvault state
        const { tokenMint, vaultLookupTable } = allKvaultStates[i];
        const assetMeta = ASSETS_MAINNET.get(tokenMint.toBase58());
        if (!assetMeta || !assetMeta.oracle) {
          throw new Error(`Oracle unavailable for asset ${tokenMint}`);
        }
        oracles.push(assetMeta.oracle);
        this._lookupTables.add(vaultLookupTable.toBase58()); // cache lookup table
      }
    });
    const kvaultPdas = await this.kvaults.getVaultPdasByShareMints(shareMints);
    kvaultPdas.forEach((p) => this._kaminoVaults.add(p.toBase58())); // cache kvault keys

    const remainingAccounts = [] as AccountMeta[];

    // first 3N remaining accounts are N tuples of (kvault_shares_ata, kvault_shares_mint, kvault_state)
    for (let i = 0; i < shareAtas.length; i++) {
      [shareAtas[i], shareMints[i], kvaultPdas[i], oracles[i]].map((pubkey) => {
        remainingAccounts.push({
          pubkey: pubkey!,
          isSigner: false,
          isWritable: false,
        });
      });
    }

    const marketsAndReserves = (
      await Promise.all(
        kvaultStates.map((kvault) => {
          return this.kvaults.composeRemainingAccounts(
            kvault.vaultAllocationStrategy.filter(
              (alloc) => !alloc.reserve.equals(PublicKey.default),
            ),
            true,
          );
        }),
      )
    ).flat();

    const processed = new Set<string>();
    const reserves = [] as PublicKey[];
    const markets = [] as PublicKey[];
    const chunkSize = 2;
    for (let i = 0; i < marketsAndReserves.length; i += chunkSize) {
      const chunk = marketsAndReserves.slice(i, i + chunkSize);
      const market = chunk[0].pubkey;
      const reserve = chunk[1].pubkey;

      // reserve should always be added to remaining accounts
      remainingAccounts.push(chunk[1]);

      // record reserves and markets for refreshReservesBatchIx
      if (!processed.has(reserve.toBase58())) {
        reserves.push(reserve);
        markets.push(market);
        processed.add(reserve.toBase58());
      }
    }

    const refreshReservesIx = this.klend.refreshReservesBatchIx(
      reserves,
      markets,
      false, // always update prices
    );
    const preInstructions = [refreshReservesIx];

    const priceIx = await this.base.mintProgram.methods
      .priceKaminoVaultShares(shareAtas.length)
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
        baseAssetOracle: await this.getbaseAssetOracle(),
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return [...preInstructions, priceIx];
  }

  /**
   * Returns an instruction that prices all Drift users (aka sub-accounts) controlled by the GLAM vault.
   */
  public async priceDriftUsersIx(): Promise<TransactionInstruction | null> {
    // 1st remaining account is user_stats, all sub accounts share the same user_stats
    const { userStats } = this.drift.getDriftUserPdas();
    const remainingAccounts = [
      { pubkey: userStats, isSigner: false, isWritable: false },
    ];

    // Fetch first 8 sub accounts
    const userPdas = Array.from(Array(8).keys()).map((subAccountId) => {
      const { user } = this.drift.getDriftUserPdas(subAccountId);
      return user;
    });
    const accountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(userPdas);

    // Parse valid sub accounts
    const driftUsers: DriftUser[] = [];
    for (let i = 0; i < accountsInfo.length; i++) {
      const accountInfo = accountsInfo[i];
      if (accountInfo) {
        const user = await this.drift.parseDriftUser(accountInfo, i);
        driftUsers.push(user);
        remainingAccounts.push({
          pubkey: userPdas[i],
          isSigner: false,
          isWritable: false,
        });
      }
    }

    if (driftUsers.length === 0) {
      return null;
    }

    // Build a set of markets and oracles that are used by all sub accounts
    const marketsAndOracles = new Set<string>();
    const spotMarketIndexes = new Set<number>(
      driftUsers.map((u) => u.spotPositions.map((p) => p.marketIndex)).flat(),
    );
    const perpMarketIndexes = new Set<number>(
      driftUsers.map((u) => u.perpPositions.map((p) => p.marketIndex)).flat(),
    );
    const spotMarkets = await this.drift.fetchAndParseSpotMarkets(
      Array.from(spotMarketIndexes),
    );
    const perpMarkets = await this.drift.fetchAndParsePerpMarkets(
      Array.from(perpMarketIndexes),
    );
    spotMarkets.forEach((m) => {
      marketsAndOracles.add(m.oracle.toBase58());
      marketsAndOracles.add(m.marketPda.toBase58());
    });
    perpMarkets.forEach((m) => {
      marketsAndOracles.add(m.oracle.toBase58());
      marketsAndOracles.add(m.marketPda.toBase58());
    });

    // Add markets and oracles to remaining accounts
    Array.from(marketsAndOracles).map((pubkey) =>
      remainingAccounts.push({
        pubkey: new PublicKey(pubkey),
        isSigner: false,
        isWritable: false,
      }),
    );

    const priceDriftUsersIx = await this.base.mintProgram.methods
      .priceDriftUsers(driftUsers.length)
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
        baseAssetOracle: await this.getbaseAssetOracle(),
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return priceDriftUsersIx;
  }

  /**
   * Returns an instruction that prices a drift vault depositor.
   * If there are no vault depositor accounts, returns null.
   */
  public async priceDriftVaultDepositorsIx(): Promise<TransactionInstruction | null> {
    const parsedVaultDepositors =
      await this.dvaults.findAndParseVaultDepositors();

    if (parsedVaultDepositors.length === 0) {
      return null;
    }

    const { remainingAccounts, numSpotMarkets, numPerpMarkets } =
      await this.remainingAccountsForPricingDriftVaultDepositors(
        parsedVaultDepositors,
      );

    const priceIx = await this.base.mintProgram.methods
      .priceDriftVaultDepositors(
        parsedVaultDepositors.length,
        numSpotMarkets,
        numPerpMarkets,
      )
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
        baseAssetOracle: await this.getbaseAssetOracle(),
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return priceIx;
  }

  /**
   * Returns an instruction that prices vault balance and tokens
   */
  async priceVaultTokensIx(): Promise<TransactionInstruction> {
    const remainingAccounts =
      await this.remainingAccountsForPricingVaultAssets();
    const aggIndexes: number[][] = [];
    const chunkSize = 3;
    for (let i = 0; i < remainingAccounts.length; i += chunkSize) {
      const chunk = remainingAccounts.slice(i, i + chunkSize);
      const mint = chunk[1].pubkey;
      const aggIndex = ASSETS_MAINNET.get(mint.toBase58())?.aggIndex || -1;
      aggIndexes.push([aggIndex, -1, -1, -1]);
    }
    // Add oracle mapping if agg oracle is used for any token
    if (aggIndexes.flat().find((i) => i >= 0)) {
      remainingAccounts.push({
        pubkey: new PublicKey("Chpu5ZgfWX5ZzVpUx9Xvv4WPM75Xd7zPJNDPsFnCpLpk"),
        isSigner: false,
        isWritable: false,
      });
    }

    const priceVaultIx = await this.base.mintProgram.methods
      .priceVaultTokens(aggIndexes)
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
        baseAssetOracle: await this.getbaseAssetOracle(),
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    return priceVaultIx;
  }

  /**
   * Returns an instruction that prices stake accounts.
   * If there are no stake accounts, returns null.
   */
  /*
  async priceStakeAccountsIx(): Promise<TransactionInstruction | null> {
    const stakes = await findStakeAccounts(
      this.base.provider.connection,
      this.base.vaultPda,
    );
    if (stakes.length === 0) {
      return null;
    }
    const priceStakesIx = await this.base.mintProgram.methods
      .priceStakeAccounts()
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
        baseAssetOracle: await this.getbaseAssetOracle(),
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
  */

  /**
   * Returns an instruction that prices Meteora positions.
   * If there are no Meteora positions, returns null.
   */
  /*
  async priceMeteoraPositionsIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    const remainingAccounts = await this.remainingAccountsForPricingMeteora();
    if (remainingAccounts.length === 0) {
      return null;
    }
    const priceMeteoraIx = await this.base.protocolProgram.methods
      .priceMeteoraPositions(priceDenom)
      .accounts({
        glamState: this.base.statePda,
        solUsdOracle: SOL_ORACLE,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    return priceMeteoraIx;
  }
  */

  public async priceVaultIxs(): Promise<TransactionInstruction[]> {
    // Cache state model
    this.cachedStateModel = await this.base.fetchStateModel();

    const priceVaultIx = await this.priceVaultTokensIx();

    // If there are no external assets, we don't need to price DeFi positions
    if ((this.cachedStateModel.externalPositions || []).length === 0) {
      return [priceVaultIx];
    }

    const pricingIxs = [priceVaultIx];
    const integrationAcls = this.cachedStateModel.integrationAcls || [];

    const driftIntegrationAcl = integrationAcls.find((acl) =>
      acl.integrationProgram.equals(this.base.extDriftProgram.programId),
    );
    if (driftIntegrationAcl) {
      // drift protocol
      if (driftIntegrationAcl.protocolsBitmask & 0b01) {
        const ix = await this.priceDriftUsersIx();
        if (ix) pricingIxs.push(ix);
      }
      // drift vaults
      if (driftIntegrationAcl.protocolsBitmask & 0b10) {
        const ix = await this.priceDriftVaultDepositorsIx();
        if (ix) pricingIxs.push(ix);
      }
    }

    const kaminoIntegrationAcl = integrationAcls.find((acl) =>
      acl.integrationProgram.equals(this.base.extKaminoProgram.programId),
    );
    if (kaminoIntegrationAcl) {
      // kamino lending
      if (kaminoIntegrationAcl.protocolsBitmask & 0b01) {
        const ixs = await this.priceKaminoObligationsIxs();
        pricingIxs.push(...ixs);
      }
      // kamino vaults
      if (kaminoIntegrationAcl.protocolsBitmask & 0b10) {
        const ixs = await this.priceKaminoVaultSharesIx();
        if (ixs) pricingIxs.push(...ixs);
      }
    }

    return pricingIxs.filter(Boolean);
  }

  public async validateAumIx(): Promise<TransactionInstruction> {
    return await this.base.mintProgram.methods
      .validateAum()
      .accounts({
        glamState: this.base.statePda,
      })
      .instruction();
  }

  async getbaseAssetOracle() {
    const { baseAssetMint } =
      this.cachedStateModel || (await this.base.fetchStateModel());
    const assetMeta = ASSETS_MAINNET.get(baseAssetMint.toBase58());
    if (!assetMeta) {
      throw new Error(`Unsupported base asset: ${baseAssetMint}`);
    }
    return assetMeta.oracle;
  }

  async remainingAccountsForPricingDriftVaultDepositors(
    parsedVaultDepositors: {
      address: PublicKey;
      driftVault: PublicKey;
      shares: any;
    }[],
  ): Promise<{
    remainingAccounts: AccountMeta[];
    numSpotMarkets: number;
    numPerpMarkets: number;
  }> {
    // Extra accounts for pricing N vault depositors:
    // - (vault_depositor, drift_vault, drift_user) x N
    // - spot_market used by drift users of vaults (no specific order)
    // - perp markets used by drift users of vaults (no specific order)
    // - oracles of spot markets and perp markets (no specific order)
    const remainingAccounts: AccountMeta[] = [];
    const spotMarketsSet = new Set<string>();
    const perpMarketsSet = new Set<string>();
    const oraclesSet = new Set<string>();
    for (const { address: depositor, driftVault } of parsedVaultDepositors) {
      const { user } = await this.dvaults.parseDriftVault(driftVault); // get drift user used by the vault
      [depositor, driftVault, user].forEach((k) =>
        remainingAccounts.push({
          pubkey: k,
          isSigner: false,
          isWritable: false,
        }),
      );

      const { spotPositions, perpPositions } =
        await this.dvaults.fetchUserPositions(user);
      const spotMarketIndexes = spotPositions.map((p) => p.marketIndex);
      const perpMarketIndexes = perpPositions.map((p) => p.marketIndex);

      // If there are perp positions, add spot market 0 as it's used as quote market for perp
      if (perpMarketIndexes.length > 0 && !spotMarketIndexes.includes(0)) {
        spotMarketIndexes.push(0);
      }

      const spotMarkets =
        await this.drift.fetchAndParseSpotMarkets(spotMarketIndexes);
      const perpMarkets =
        await this.drift.fetchAndParsePerpMarkets(perpMarketIndexes);

      spotMarkets.forEach((m) => {
        oraclesSet.add(m.oracle.toBase58());
        spotMarketsSet.add(m.marketPda.toBase58());
      });
      perpMarkets.forEach((m) => {
        oraclesSet.add(m.oracle.toBase58());
        perpMarketsSet.add(m.marketPda.toBase58());
      });
    }

    [...spotMarketsSet, ...perpMarketsSet, ...oraclesSet].forEach((k) =>
      remainingAccounts.push({
        pubkey: new PublicKey(k),
        isSigner: false,
        isWritable: false,
      }),
    );

    return {
      remainingAccounts,
      numSpotMarkets: spotMarketsSet.size,
      numPerpMarkets: perpMarketsSet.size,
    };
  }

  async remainingAccountsForPricingMeteora(): Promise<AccountMeta[]> {
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
  }

  async remainingAccountsForPricingVaultAssets(): Promise<AccountMeta[]> {
    const stateModel = await this.base.fetchStateModel();
    return stateModel.assetsForPricing
      .map((mint) => {
        const assetMeta = ASSETS_MAINNET.get(mint.toBase58());
        if (!assetMeta) {
          throw new Error(`Asset meta not found for ${mint}`);
        }
        const ata = this.base.getVaultAta(mint, assetMeta?.programId);
        return [ata, mint, assetMeta.oracle];
      })
      .flat()
      .map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: false,
      }));
  }
}
