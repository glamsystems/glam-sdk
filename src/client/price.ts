import {
  AccountMeta,
  Commitment,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  KaminoLendingClient,
  KaminoVaultsClient,
  ParsedReserve,
} from "./kamino";

import { BaseClient } from "./base";

import { ASSETS_MAINNET, SOL_ORACLE } from "../assets";
import { StateModel } from "../models";
import {
  DriftProtocolClient,
  DriftUser,
  DriftVaultsClient,
  SpotMarket,
} from "./drift";
import {
  bfToDecimal,
  decodeUser,
  findStakeAccounts,
  Fraction,
  MarketType,
  PkMap,
  PkSet,
  SpotBalanceType,
  toUiAmount,
} from "../utils";
import Decimal from "decimal.js";
import {
  AccountLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { KAMINO_LENDING_PROGRAM, KAMINO_OBTRIGATION_SIZE } from "../constants";
import { fetchTokensList, TokenListItem } from "./jupiter";
import { KVaultState } from "../deser";

export class Holding {
  readonly uiAmount!: number;

  constructor(
    readonly mintAddress: PublicKey,
    readonly decimals: number,
    readonly amount: BN,
    readonly price: number,
    readonly priceMeta: Record<string, any> = {},
    readonly protocol: string,
    readonly protocolMeta: Record<string, any> = {},
  ) {
    this.uiAmount = toUiAmount(this.amount, this.decimals);
  }
}

export class VaultHoldings {
  holdings: Holding[];

  constructor(
    readonly vaultState: PublicKey,
    readonly vaultPda: PublicKey,
    readonly priceBaseAssetMint: PublicKey,
    readonly slot: number,
    readonly timestamp: number,
    readonly commitment: Commitment,
  ) {
    this.holdings = [];
  }

  add(holding: Holding) {
    this.holdings.push(holding);
  }

  toJson() {
    return JSON.stringify(this, null, 2);
  }
}

export class PriceClient {
  private _stateModel: StateModel | null = null;
  private _lookupTables = new PkSet();
  private _kaminoVaults = new PkSet();

  public constructor(
    readonly base: BaseClient,
    readonly klend: KaminoLendingClient,
    readonly kvaults: KaminoVaultsClient,
    readonly drift: DriftProtocolClient,
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
    return Array.from(this._lookupTables);
  }

  get kaminoVaults() {
    return Array.from(this._kaminoVaults);
  }

  /**
   * Fetches all holdings in the vault.
   *
   * @param commitment Commitment level for fetching accounts
   * @param priceBaseAssetMint Price reference/numeraire asset mint (default: USD)
   * @returns VaultHoldings object containing all holdings
   */
  async getVaultHoldings(
    commitment: Commitment,
    priceBaseAssetMint: PublicKey = PublicKey.default,
  ): Promise<VaultHoldings> {
    const { integrationAcls, externalPositions } =
      await this.base.fetchStateAccount(); // fetch state account only, don't need to build entire state model
    const externalPositionsSet = new PkSet(externalPositions);

    let driftPubkeys = new PkMap<PkSet>(); // user -> markets map
    let kaminoPubkeys = new PkMap<PkSet>(); // obligation -> reserves map
    let kvaultAtasAndStates = new PkMap<KVaultState>(); // kvault share ata -> kvault state
    let kvaultReserves = new PkSet();

    const driftIntegrationAcl = integrationAcls.find((acl) =>
      acl.integrationProgram.equals(this.base.extDriftProgram.programId),
    );
    if (driftIntegrationAcl) {
      // drift protocol
      if (driftIntegrationAcl.protocolsBitmask & 0b01) {
        driftPubkeys = await this.getPubkeysForSpotHoldings(commitment);
      }
      // TODO: parse drift vaults holdings
      if (driftIntegrationAcl.protocolsBitmask & 0b10) {
      }
    }

    const kaminoIntegrationAcl = integrationAcls.find((acl) =>
      acl.integrationProgram.equals(this.base.extKaminoProgram.programId),
    );
    if (kaminoIntegrationAcl) {
      // kamino lending
      if (kaminoIntegrationAcl.protocolsBitmask & 0b01) {
        kaminoPubkeys = await this.getPubkeysForKaminoHoldings(commitment);
      }
      // kamino vaults
      if (kaminoIntegrationAcl.protocolsBitmask & 0b10) {
        kvaultAtasAndStates = await this.getKaminoVaultStates(
          externalPositionsSet,
          commitment,
        );
        // from each kvault state we can get the allocations (including reserves)
        Array.from(kvaultAtasAndStates.pkEntries()).map(([_, kvaultState]) => {
          kvaultState.validAllocations.forEach(({ reserve }) => {
            kvaultReserves.add(reserve);
          });
        });
      }
    }

    const tokenPubkeys = await this.getPubkeysForTokenHoldings(
      externalPositionsSet,
      commitment,
    );
    const driftUsers = Array.from(driftPubkeys.pkKeys());
    const driftSpotMarkets = [...driftPubkeys.values()]
      .map((s) => Array.from(s.pkValues()))
      .flat();

    const kaminoObligations = Array.from(kaminoPubkeys.pkKeys());
    const kaminoReserves = [...kaminoPubkeys.values()]
      .map((v) => Array.from(v.pkValues()))
      .flat()
      .concat(Array.from(kvaultReserves));
    const kvaultAtas = Array.from(kvaultAtasAndStates.pkKeys());

    // Dedupe keys and fetch all accounts in a single RPC call
    const pubkeys = Array.from(
      new PkSet([
        ...tokenPubkeys,
        ...driftUsers,
        ...driftSpotMarkets,
        ...kaminoObligations,
        ...kaminoReserves,
        ...kvaultAtas,
        SYSVAR_CLOCK_PUBKEY, // read unix timestamp from sysvar clock account
      ]),
    );
    const {
      context: { slot },
      value: accountsInfo,
    } = await this.base.provider.connection.getMultipleAccountsInfoAndContext(
      pubkeys,
      commitment,
    );

    // Build a map of pubkey to account data for quick lookup
    const accountsDataMap = new PkMap<Buffer>();
    for (let i = 0; i < accountsInfo.length; i++) {
      accountsDataMap.set(pubkeys[i], accountsInfo[i]!.data);
    }

    // Build a map of parsed drift spot markets
    const driftSpotMarketsMap = new PkMap<SpotMarket>();
    for (let i = 0; i < driftSpotMarkets.length; i++) {
      const market = this.drift.parseSpotMarket(
        driftSpotMarkets[i],
        accountsDataMap.get(driftSpotMarkets[i])!,
      );
      driftSpotMarketsMap.set(driftSpotMarkets[i], market);
    }

    // Build a map of parsed kamino reserves
    const kaminoReservesMap = new PkMap<ParsedReserve>();
    for (let i = 0; i < kaminoReserves.length; i++) {
      const reserve = this.klend.parseReserve(
        kaminoReserves[i],
        accountsDataMap.get(kaminoReserves[i])!,
      );
      kaminoReservesMap.set(kaminoReserves[i], reserve);
    }

    // Build a map of token prices (in USD)
    const tokenPricesMap = new PkMap<TokenListItem>();
    (await fetchTokensList()).forEach((item) => {
      const tokenMint = new PublicKey(item.address);
      tokenPricesMap.set(tokenMint, item);
    });

    const tokenHoldings = this.getTokenHoldings(
      tokenPubkeys,
      accountsDataMap,
      tokenPricesMap,
      "Jupiter",
    );
    const driftSpotHoldings = this.getDriftSpotHoldings(
      driftPubkeys.pkKeys(),
      driftSpotMarketsMap,
      accountsDataMap,
      tokenPricesMap,
      "Jupiter",
    );
    const kaminoLendHoldings = this.getKaminoLendHoldings(
      kaminoPubkeys.pkKeys(),
      kaminoReservesMap,
      accountsDataMap,
      tokenPricesMap,
      "Jupiter",
    );
    const kaminoVaultsHoldings = this.getKaminoVaultsHoldings(
      kvaultAtasAndStates,
      kaminoReservesMap,
      accountsDataMap,
      tokenPricesMap,
      "Jupiter",
    );

    const timestamp = accountsDataMap
      .get(SYSVAR_CLOCK_PUBKEY)!
      .readUInt32LE(32);
    const ret = new VaultHoldings(
      this.base.statePda,
      this.base.vaultPda,
      priceBaseAssetMint,
      slot,
      timestamp!,
      commitment,
    );
    tokenHoldings.forEach((holding) => ret.add(holding));
    driftSpotHoldings.forEach((holding) => ret.add(holding));
    kaminoLendHoldings.forEach((holding) => ret.add(holding));
    kaminoVaultsHoldings.forEach((holding) => ret.add(holding));
    return ret;
  }

  async getPubkeysForTokenHoldings(
    externalPositionsSet: PkSet,
    commitment?: Commitment,
  ): Promise<PublicKey[]> {
    const results = await Promise.all(
      [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map((programId) =>
        this.base.connection.getTokenAccountsByOwner(
          this.base.vaultPda,
          { programId },
          commitment,
        ),
      ),
    );
    const pubkeys = results.flatMap((result) =>
      result.value.map((ta) => ta.pubkey),
    );
    // Filter out token accounts tracked as external positions
    // They are NOT considered as token holdings
    return pubkeys.filter((p) => !externalPositionsSet.has(p));
  }

  async getPubkeysForSpotHoldings(
    commitment?: Commitment,
  ): Promise<PkMap<PkSet>> {
    const userPdas = Array.from(Array(8).keys()).map((subAccountId) => {
      const { user } = this.drift.getDriftUserPdas(subAccountId);
      return user;
    });
    const accountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(
        userPdas,
        commitment,
      );
    const userMarketsMap = new PkMap<PkSet>();
    for (let i = 0; i < accountsInfo.length; i++) {
      const accountInfo = accountsInfo[i];
      if (accountInfo) {
        // get spot markets user has a position in
        const { spotPositions } = decodeUser(accountInfo.data);
        const spotMarketIndexes = spotPositions.map((p) => p.marketIndex);
        const spotMarketPdas = spotMarketIndexes.map((index) =>
          this.drift.getMarketPda(MarketType.SPOT, index),
        );
        userMarketsMap.set(userPdas[i], new PkSet(spotMarketPdas));
      }
    }

    return userMarketsMap;
  }

  // TODO: implement
  async getPubkeysForDriftVaultsHoldings(
    commitment?: Commitment,
  ): Promise<PkMap<PkSet>> {
    return new PkMap<PkSet>();
  }

  async getKaminoVaultStates(
    externalPositionsSet: PkSet,
    commitment?: Commitment,
  ): Promise<PkMap<KVaultState>> {
    // Get all kvault states and share token mints
    const allKvaultStates =
      await this.kvaults.findAndParseKaminoVaults(commitment);
    const allKvaultMints = allKvaultStates.map((kvault) => kvault.sharesMint);
    const possibleShareAtas = allKvaultMints.map((mint) =>
      this.base.getVaultAta(mint),
    );
    const possibleShareAtaAccountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(
        possibleShareAtas,
        commitment,
      );

    const map = new PkMap<KVaultState>();
    possibleShareAtaAccountsInfo.forEach((info, i) => {
      // share ata must exist and it must be tracked by glam state
      const ata = possibleShareAtas[i];
      if (info !== null && externalPositionsSet.has(possibleShareAtas[i])) {
        map.set(ata, allKvaultStates[i]);
      }
    });
    return map;
  }

  async getPubkeysForKaminoHoldings(
    commitment?: Commitment,
  ): Promise<PkMap<PkSet>> {
    const obligationAccounts =
      await this.base.provider.connection.getProgramAccounts(
        KAMINO_LENDING_PROGRAM,
        {
          commitment,
          filters: [
            { dataSize: KAMINO_OBTRIGATION_SIZE },
            { memcmp: { offset: 64, bytes: this.base.vaultPda.toBase58() } },
          ],
        },
      );
    if (obligationAccounts.length === 0) {
      return new PkMap<PkSet>();
    }

    const obligationReservesMap = new PkMap<PkSet>();
    for (const { pubkey, account } of obligationAccounts) {
      const reservesSet = new PkSet();
      const { deposits, borrows } = this.klend.parseObligation(
        pubkey,
        account.data,
      );
      deposits.map(({ reserve }) => reservesSet.add(reserve));
      borrows.map(({ reserve }) => reservesSet.add(reserve));
      obligationReservesMap.set(pubkey, reservesSet);
    }

    return obligationReservesMap;
  }

  getTokenHoldings(
    tokenAccountPubkeys: PublicKey[],
    accountsDataMap: PkMap<Buffer>,
    tokenPricesMap: PkMap<TokenListItem>,
    priceSource: string,
  ): Holding[] {
    const holdings: Holding[] = [];
    if (tokenAccountPubkeys.length === 0) {
      return holdings;
    }

    for (const pubkey of tokenAccountPubkeys) {
      const { amount, mint } = AccountLayout.decode(
        accountsDataMap.get(pubkey)!,
      );

      const tokenInfo = tokenPricesMap.get(mint);
      if (tokenInfo) {
        const { decimals, usdPrice } = tokenInfo;
        const holding = new Holding(
          mint,
          decimals,
          new BN(amount),
          usdPrice,
          { slot: tokenInfo.slot, source: priceSource },
          "Token",
          {
            tokenAccount: pubkey,
          },
        );
        holdings.push(holding);
      }
    }

    return holdings;
  }

  getDriftSpotHoldings(
    userPubkeys: Iterable<PublicKey>,
    spotMarketsMap: PkMap<SpotMarket>,
    accountsDataMap: PkMap<Buffer>,
    tokenPricesMap: PkMap<TokenListItem>,
    priceSource: string,
  ): Holding[] {
    const holdings: Holding[] = [];

    for (const userPda of userPubkeys) {
      const { spotPositions } = decodeUser(accountsDataMap.get(userPda)!);

      for (const { marketIndex, scaledBalance, balanceType } of spotPositions) {
        const marketPda = this.drift.getMarketPda(MarketType.SPOT, marketIndex);
        const {
          mint,
          decimals,
          cumulativeDepositInterest,
          cumulativeBorrowInterest,
        } = spotMarketsMap.get(marketPda)!;

        const interest =
          balanceType === SpotBalanceType.BORROW
            ? cumulativeBorrowInterest
            : cumulativeDepositInterest;

        const amount = this.drift.calcSpotBalanceBn(
          scaledBalance,
          decimals,
          interest,
        );

        const direction = Object.keys(balanceType)[0] as "deposit" | "borrow";
        const { usdPrice, slot } = tokenPricesMap.get(mint)!;
        const holding = new Holding(
          mint,
          decimals,
          amount,
          usdPrice,
          { slot, source: priceSource },
          "DriftProtocol",
          {
            user: userPda,
            marketIndex: marketIndex,
            direction: direction,
          },
        );
        holdings.push(holding);
      }
    }

    return holdings;
  }

  getKaminoLendHoldings(
    obligationPubkeys: Iterable<PublicKey>,
    reservesMap: PkMap<ParsedReserve>,
    accountsDataMap: PkMap<Buffer>,
    tokenPricesMap: PkMap<TokenListItem>,
    priceSource: string,
  ): Holding[] {
    const holdings: Holding[] = [];
    for (const obligation of obligationPubkeys) {
      const { deposits, borrows } = this.klend.parseObligation(
        obligation,
        accountsDataMap.get(obligation)!,
      );

      for (const { reserve, depositedAmount } of deposits) {
        const {
          collateralExchangeRate,
          liquidityMint,
          liquidityMintDecimals,
          market,
        } = reservesMap.get(reserve)!;
        const supplyAmount = new Decimal(depositedAmount.toString())
          .div(collateralExchangeRate)
          .floor();
        const amount = new BN(supplyAmount.toString());
        const { usdPrice, slot } = tokenPricesMap.get(liquidityMint)!;
        const holding = new Holding(
          liquidityMint,
          liquidityMintDecimals,
          amount,
          usdPrice,
          { slot, source: priceSource },
          "KaminoLend",
          {
            obligation,
            market,
            reserve,
            direction: "deposit" as const,
          },
        );
        holdings.push(holding);
      }

      for (const {
        reserve,
        borrowedAmountSf,
        cumulativeBorrowRateBsf,
      } of borrows) {
        const {
          cumulativeBorrowRate,
          liquidityMint,
          liquidityMintDecimals,
          market,
        } = reservesMap.get(reserve)!;
        const obligationCumulativeBorrowRate = bfToDecimal(
          cumulativeBorrowRateBsf,
        );
        const borrowAmount = new Fraction(borrowedAmountSf)
          .toDecimal()
          .mul(cumulativeBorrowRate)
          .div(obligationCumulativeBorrowRate)
          .ceil();

        const amount = new BN(borrowAmount.toString());
        const { usdPrice, slot } = tokenPricesMap.get(liquidityMint)!;
        const holding = new Holding(
          liquidityMint,
          liquidityMintDecimals,
          amount,
          usdPrice,
          { slot, source: priceSource },
          "KaminoLend",
          {
            obligation,
            market,
            reserve,
            direction: "borrow" as const,
          },
        );
        holdings.push(holding);
      }
    }

    return holdings;
  }

  getKaminoVaultsHoldings(
    kvaultAtasAndStates: PkMap<KVaultState>,
    reservesMap: PkMap<ParsedReserve>,
    accountsDataMap: PkMap<Buffer>,
    tokenPricesMap: PkMap<TokenListItem>,
    priceSource: string,
  ): Holding[] {
    const holdings: Holding[] = [];
    for (const [ata, kvaultState] of kvaultAtasAndStates.pkEntries()) {
      const tokenAccount = AccountLayout.decode(accountsDataMap.get(ata)!);

      let aum = new Decimal(kvaultState.tokenAvailable.toString());
      kvaultState.validAllocations.map((allocation) => {
        const { collateralExchangeRate } = reservesMap.get(allocation.reserve)!;

        // allocation ctoken amount to liq asset amount
        const liqAmount = new Decimal(allocation.ctokenAllocation.toString())
          .div(collateralExchangeRate)
          .floor();
        aum = aum.add(liqAmount);
      });

      // calculate liquidity token amount
      const amount = new Decimal(tokenAccount.amount.toString())
        .div(new Decimal(kvaultState.sharesIssued.toString()))
        .mul(aum)
        .floor();
      const { usdPrice, slot } = tokenPricesMap.get(kvaultState.tokenMint)!;
      const holding = new Holding(
        kvaultState.tokenMint,
        kvaultState.tokenMintDecimals.toNumber(),
        new BN(amount.toString()),
        usdPrice,
        { slot, source: priceSource },
        "KaminoVaults",
        {
          kaminoVault: kvaultState._address,
          kaminoVaultAta: ata,
        },
      );
      holdings.push(holding);
    }

    return holdings;
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

    const obligationReservesMap = new PkMap<PkSet>();
    const reservesSet = new PkSet();

    // Get all reserves used by obligations
    parsedObligations.map(({ address: obligation, deposits, borrows }) => {
      obligationReservesMap.set(obligation, new PkSet());
      deposits.forEach(({ reserve }) => {
        reservesSet.add(reserve);
        obligationReservesMap.get(obligation)?.add(reserve);
      });
      borrows.forEach(({ reserve }) => {
        reservesSet.add(reserve);
        obligationReservesMap.get(obligation)?.add(reserve);
      });
    });

    // Refresh reserves in batch
    const parsedReserves = await this.klend.fetchAndParseReserves(
      Array.from(reservesSet),
    );
    ixs.push(
      this.klend.txBuilder.refreshReservesBatchIx(parsedReserves, false),
    );

    // Refresh obligations
    parsedObligations.forEach(({ address: obligation, lendingMarket }) => {
      ixs.push(
        this.klend.txBuilder.refreshObligationIx({
          obligation,
          lendingMarket,
          reserves: Array.from(obligationReservesMap.get(obligation) || []),
        }),
      );
    });

    const remainingAccounts = Array.from(obligationReservesMap.pkKeys()).map(
      (pubkey) => ({
        pubkey,
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

    // All kvault share token accounts GLAM vault could possibly hold
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
        this._lookupTables.add(vaultLookupTable); // cache lookup table
      }
    });
    const kvaultPdas = await this.kvaults.getVaultPdasByShareMints(shareMints);
    kvaultPdas.forEach((p) => this._kaminoVaults.add(p)); // cache kvault keys

    const remainingAccounts = [] as AccountMeta[];

    // first 4N remaining accounts are N tuples of (kvault_shares_ata, kvault_shares_mint, kvault_state, kvault_deposit_asset_oracle)
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

    const processed = new PkSet();
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
      if (!processed.has(reserve)) {
        reserves.push(reserve);
        markets.push(market);
        processed.add(reserve);
      }
    }

    const parsedReserves = await this.klend.fetchAndParseReserves(reserves);
    const refreshReservesIx = this.klend.txBuilder.refreshReservesBatchIx(
      parsedReserves,
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
    const marketsAndOracles = new PkSet();
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
      marketsAndOracles.add(m.oracle);
      marketsAndOracles.add(m.marketPda);
    });
    perpMarkets.forEach((m) => {
      marketsAndOracles.add(m.oracle);
      marketsAndOracles.add(m.marketPda);
    });

    // Add markets and oracles to remaining accounts
    Array.from(marketsAndOracles).map((pubkey) =>
      remainingAccounts.push({
        pubkey,
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
  async priceStakeAccountsIx(): Promise<TransactionInstruction | null> {
    const stakes = await findStakeAccounts(
      this.base.connection,
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

    const nativeIntegrationAcl = integrationAcls.find((acl) =>
      acl.integrationProgram.equals(this.base.protocolProgram.programId),
    );
    if (nativeIntegrationAcl) {
      // stake program
      if (nativeIntegrationAcl.protocolsBitmask & 0b10) {
        const ix = await this.priceStakeAccountsIx();
        if (ix) pricingIxs.push(ix);
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
    const spotMarketsSet = new PkSet();
    const perpMarketsSet = new PkSet();
    const oraclesSet = new PkSet();
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
        oraclesSet.add(m.oracle);
        spotMarketsSet.add(m.marketPda);
      });
      perpMarkets.forEach((m) => {
        oraclesSet.add(m.oracle);
        perpMarketsSet.add(m.marketPda);
      });
    }

    [...spotMarketsSet, ...perpMarketsSet, ...oraclesSet].forEach((pubkey) =>
      remainingAccounts.push({
        pubkey,
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
