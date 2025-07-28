import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
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
import { DriftClient, DriftUser, DriftVaultsClient } from "./drift";

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
  ): Promise<TransactionInstruction[] | null> {
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
    const oracles: PublicKey[] = []; // oracle of kvault deposit token
    possibleShareAtaAccountsInfo.forEach((info, i) => {
      if (info !== null) {
        shareAtas.push(possibleShareAtas[i]);
        shareMints.push(allKvaultMints[i]);
        kvaultStates.push(allKvaultStates[i]);
        const { tokenMint } = allKvaultStates[i];
        const assetMeta = ASSETS_MAINNET.get(tokenMint.toBase58());
        oracles.push(assetMeta?.oracle!);
      }
    });
    const kvaultPdas = await this.kvaults.getVaultPdasByShareMints(shareMints);

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
    const preInstructions = [];
    const chunkSize = 2;
    for (let i = 0; i < marketsAndReserves.length; i += chunkSize) {
      const chunk = marketsAndReserves.slice(i, i + chunkSize);
      const market = chunk[0].pubkey;
      const reserve = chunk[1].pubkey;

      // reserve should always be added to remaining accounts
      remainingAccounts.push(chunk[1]);

      // each reserve should only be refreshed once
      if (!processed.has(reserve.toBase58())) {
        const ix = this.klend.refreshReserveIxs(market, [reserve]);
        preInstructions.push(...ix);
        processed.add(reserve.toBase58());
      }
    }

    const priceIx = await this.base.program.methods
      .priceKaminoVaultShares(priceDenom, shareAtas.length)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return [...preInstructions, priceIx];
  }

  /**
   * Returns an instruction that prices all Drift users (aka sub-accounts) controlled by the GLAM vault.
   */
  public async priceDriftUsersIx(
    priceDenom: PriceDenom,
  ): Promise<TransactionInstruction | null> {
    // 1st remaining account is user_stats
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

    const priceDriftUsersIx = await this.base.program.methods
      .priceDriftUsers(priceDenom, driftUsers.length)
      .accounts({
        glamState: this.base.statePda,
        solOracle: SOL_ORACLE,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return priceDriftUsersIx;
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

    const remainingAccounts = [];
    const marketsAndOracles = new Set<string>();
    for (const depositor of parsedVaultDepositors) {
      const { user: driftUser } = await this.dvaults.parseDriftVault(
        depositor.driftVault,
      );
      remainingAccounts.push({
        pubkey: depositor.address,
        isSigner: false,
        isWritable: false,
      });
      remainingAccounts.push({
        pubkey: depositor.driftVault,
        isSigner: false,
        isWritable: false,
      });
      remainingAccounts.push({
        pubkey: driftUser,
        isSigner: false,
        isWritable: false,
      });

      const markets_and_oracles = (
        await this.dvaults.composeRemainingAccounts(driftUser)
      ).map((a) => a.pubkey.toBase58());
      for (const k of markets_and_oracles) {
        marketsAndOracles.add(k);
      }
    }

    Array.from(marketsAndOracles).forEach((k) =>
      remainingAccounts.push({
        pubkey: new PublicKey(k),
        isSigner: false,
        isWritable: false,
      }),
    );

    const priceIx = await this.base.program.methods
      .priceDriftVaultDepositors(priceDenom, parsedVaultDepositors.length)
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
      .priceVaultTokens(priceDenom)
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

    const integrations = (stateModel.integrations || []).map(
      (i) => Object.keys(i)[0],
    );
    const integrationsToPricingFns: {
      [key: string]: (priceDenom: PriceDenom) => Promise<any>;
    } = {
      drift: this.priceDriftUsersIx.bind(this),
      kaminoLending: this.priceKaminoObligationsIx.bind(this),
      nativeStaking: this.priceStakesIx.bind(this),
      meteoraDlmm: this.priceMeteoraPositionsIx.bind(this),
      driftVaults: this.priceDriftVaultDepositorsIx.bind(this),
      kaminoVaults: this.priceKaminoVaultSharesIx.bind(this),
    };

    const pricingFns = integrations
      .map((integration) => integrationsToPricingFns[integration])
      .filter(Boolean);

    const pricingIxs = [priceVaultIx];
    for (const fn of pricingFns) {
      const ix = await fn(priceDenom);
      if (Array.isArray(ix)) {
        pricingIxs.push(...ix);
      } else {
        pricingIxs.push(ix);
      }
    }
    return pricingIxs.filter(Boolean);
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
