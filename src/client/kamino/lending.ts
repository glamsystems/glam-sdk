import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
  AccountMeta,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";

import { BaseClient, BaseTxBuilder, TxOptions } from "../base";
import * as borsh from "@coral-xyz/borsh";
import { fetchMintAndTokenProgram } from "../../utils/accounts";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  KAMINO_FARM_PROGRAM,
  KAMINO_LENDING_PROGRAM,
  KAMINO_OBTRIGATION_SIZE,
  KAMINO_RESERVE_SIZE,
  WSOL,
} from "../../constants";
import { Reserve, Obligation } from "../../deser/kaminoLayouts";
import { VaultClient } from "../vault";
import { PkSet, PkMap } from "../../utils";
import {
  DEFAULT_OBLIGATION_ARGS,
  ParsedReserve,
  ParsedObligation,
  RefreshObligationAccounts,
  RefreshReserveAccounts,
  RefreshObligationFarmsForReserveArgs,
  RefreshObligationFarmsForReserveAccounts,
} from "./types";

class TxBuilder extends BaseTxBuilder<KaminoLendingClient> {
  refreshObligationIx(accounts: RefreshObligationAccounts) {
    const keys: Array<AccountMeta> = [
      { pubkey: accounts.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: accounts.obligation, isSigner: false, isWritable: true },
    ];
    accounts.reserves.forEach((reserve) => {
      keys.push({ pubkey: reserve, isSigner: false, isWritable: false });
    });

    const identifier = Buffer.from([33, 132, 147, 228, 151, 192, 72, 89]);
    const data = identifier;
    return new TransactionInstruction({
      keys,
      programId: KAMINO_LENDING_PROGRAM,
      data,
    });
  }

  refreshReserveIx(accounts: RefreshReserveAccounts) {
    const keys: Array<AccountMeta> = [
      { pubkey: accounts.reserve, isSigner: false, isWritable: true },
      { pubkey: accounts.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: accounts.pythOracle, isSigner: false, isWritable: false },
      {
        pubkey: accounts.switchboardPriceOracle,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.switchboardTwapOracle,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: accounts.scopePrices, isSigner: false, isWritable: false },
    ];
    const identifier = Buffer.from([2, 218, 138, 235, 79, 201, 25, 102]);
    const data = identifier;
    return new TransactionInstruction({
      keys,
      programId: KAMINO_LENDING_PROGRAM,
      data,
    });
  }

  refreshObligationFarmsForReserveIx(
    args: RefreshObligationFarmsForReserveArgs,
    accounts: RefreshObligationFarmsForReserveAccounts,
  ) {
    const keys: Array<AccountMeta> = [
      { pubkey: accounts.crank, isSigner: true, isWritable: false },
      {
        pubkey: accounts.baseAccounts.obligation,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.baseAccounts.lendingMarketAuthority,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.baseAccounts.reserve,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.baseAccounts.reserveFarmState,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.baseAccounts.obligationFarmUserState,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.baseAccounts.lendingMarket,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: accounts.farmsProgram, isSigner: false, isWritable: false },
      { pubkey: accounts.rent, isSigner: false, isWritable: false },
      { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    ];
    const identifier = Buffer.from([140, 144, 253, 21, 10, 74, 248, 3]);
    const buffer = Buffer.alloc(1000);
    const layout = borsh.struct([borsh.u8("mode")]);
    const len = layout.encode({ mode: args.mode }, buffer);
    const data = Buffer.concat([identifier, buffer]).subarray(0, 8 + len);
    return new TransactionInstruction({
      keys,
      programId: KAMINO_LENDING_PROGRAM,
      data,
    });
  }

  refreshReservesBatchIx(reserves: ParsedReserve[], skipPriceUpdates: boolean) {
    const keys: Array<AccountMeta> = [];
    for (const { address, market, scopePriceFeed } of reserves) {
      keys.push({
        pubkey: address,
        isSigner: false,
        isWritable: true,
      });
      keys.push({
        pubkey: market,
        isSigner: false,
        isWritable: true,
      });
      if (!skipPriceUpdates) {
        [
          KAMINO_LENDING_PROGRAM, // pyth oracle, null
          KAMINO_LENDING_PROGRAM, // switchboard price oracle, null
          KAMINO_LENDING_PROGRAM, // switchboard twap oracle, null
          scopePriceFeed,
        ].forEach((p) =>
          keys.push({ pubkey: p, isSigner: false, isWritable: false }),
        );
      }
    }
    const identifier = Buffer.from([144, 110, 26, 103, 162, 204, 252, 147]);
    const buffer = Buffer.alloc(1000);
    const layout = borsh.struct([borsh.bool("skipPriceUpdates")]);
    const len = layout.encode({ skipPriceUpdates }, buffer);
    const data = Buffer.concat([identifier, buffer]).subarray(0, 8 + len);
    return new TransactionInstruction({
      keys,
      programId: KAMINO_LENDING_PROGRAM,
      data,
    });
  }

  refreshReservesIxs(lendingMarket: PublicKey, reserves: ParsedReserve[]) {
    return reserves.map(({ address, scopePriceFeed }) =>
      this.refreshReserveIx({
        reserve: address,
        lendingMarket,
        pythOracle: KAMINO_LENDING_PROGRAM,
        switchboardPriceOracle: KAMINO_LENDING_PROGRAM,
        switchboardTwapOracle: KAMINO_LENDING_PROGRAM,
        scopePrices: scopePriceFeed,
      }),
    );
  }

  refreshObligationCollateralFarmsForReservesIxs(
    obligation: PublicKey,
    lendingMarket: PublicKey,
    parsedReserves: ParsedReserve[],
  ) {
    return parsedReserves
      .map((parsedReserve) => {
        const { farmCollateral } = parsedReserve;
        return [farmCollateral]
          .filter((farm) => !!farm)
          .map((farm) => {
            const obligationFarmUserState = this.client.getFarmUserState(
              obligation,
              farm,
            );
            return this.refreshObligationFarmsForReserveIx(
              { mode: 0 },
              {
                crank: this.client.base.signer, // Must be signer
                baseAccounts: {
                  obligation,
                  lendingMarketAuthority:
                    this.client.getMarketAuthority(lendingMarket),
                  reserve: parsedReserve.address,
                  reserveFarmState: farm,
                  obligationFarmUserState,
                  lendingMarket,
                },
                farmsProgram: KAMINO_FARM_PROGRAM,
                rent: SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
              },
            );
          });
      })
      .flat();
  }

  refreshObligationDebtFarmsForReservesIxs(
    obligation: PublicKey,
    lendingMarket: PublicKey,
    parsedReserves: ParsedReserve[],
  ) {
    return parsedReserves
      .map((parsedReserve) => {
        const { farmDebt } = parsedReserve;
        return [farmDebt]
          .filter((farm) => !!farm)
          .map((farm) => {
            const obligationFarmUserState = this.client.getFarmUserState(
              obligation,
              farm,
            );
            return this.refreshObligationFarmsForReserveIx(
              { mode: 1 },
              {
                crank: this.client.base.signer, // Must be signer
                baseAccounts: {
                  obligation,
                  lendingMarketAuthority:
                    this.client.getMarketAuthority(lendingMarket),
                  reserve: parsedReserve.address,
                  reserveFarmState: farm,
                  obligationFarmUserState,
                  lendingMarket,
                },
                farmsProgram: KAMINO_FARM_PROGRAM,
                rent: SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
              },
            );
          });
      })
      .flat();
  }

  /**
   * Returns two instructions that refresh reserves in batch and refresh obligation
   */
  async refreshReservesAndObligationIxs(
    obligation: PublicKey,
    targetReserve: ParsedReserve,
  ) {
    // Get a set of reserves to refresh
    const { deposits, borrows, lendingMarket } =
      await this.client.fetchAndParseObligation(obligation);
    const reservesInUse = deposits
      .map(({ reserve }) => reserve)
      .concat(borrows.map(({ reserve }) => reserve));

    // Refresh all reserves, including those in use and target reserve
    const reservesSet = new PkSet();
    reservesInUse.forEach((reserve) => reservesSet.add(reserve));
    reservesSet.add(targetReserve.address);
    const parsedReserves = await this.client.fetchAndParseReserves(
      Array.from(reservesSet),
    );
    const refreshReservesIx = this.refreshReservesBatchIx(
      parsedReserves,
      false,
    );

    // Refresh obligation with reserves in use (exclude target reserve)
    const refreshObligationIx = this.refreshObligationIx({
      lendingMarket,
      obligation,
      reserves: reservesInUse,
    });

    return [refreshReservesIx, refreshObligationIx];
  }

  /**
   * Returns an instruction to initialize obligation farm user if it doesn't exist
   *
   * @param mode 0 collateral farm, 1 debt farm
   */
  async initObligationFarmUserForReserveIx(
    obligation: PublicKey,
    { address, market, farmCollateral, farmDebt }: ParsedReserve,
    mode: 0 | 1,
    signer?: PublicKey,
  ) {
    const farmState = mode === 0 ? farmCollateral : farmDebt;

    if (!farmState) {
      return { farmUser: null, initIx: null };
    }

    const farmUser = this.client.getFarmUserState(obligation, farmState);
    const farmUserAccount =
      await this.client.base.connection.getAccountInfo(farmUser);
    const initIx = farmUserAccount
      ? null
      : await this.client.base.extKaminoProgram.methods
          .lendingInitObligationFarmsForReserve(mode)
          .accounts({
            glamState: this.client.base.statePda,
            glamSigner: signer || this.client.base.signer,
            obligation,
            lendingMarketAuthority: this.client.getMarketAuthority(market),
            reserve: address,
            reserveFarmState: farmState,
            obligationFarm: farmUser,
            lendingMarket: market,
            farmsProgram: KAMINO_FARM_PROGRAM,
          })
          .instruction();
    return { farmUser, initIx };
  }

  public async initUserMetadataTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const vault = this.client.base.vaultPda;
    const userMetadata = this.client.getUserMetadataPda(vault);
    const lookupTable = new PublicKey(0); // FIXME: create lookup table

    const tx = await this.client.base.extKaminoProgram.methods
      .lendingInitUserMetadata(lookupTable)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        userMetadata,
        referrerUserMetadata: null,
      })
      .transaction();

    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async depositIxs(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const vault = this.client.base.vaultPda;
    const userMetadata = this.client.getUserMetadataPda(vault);
    const obligation = this.client.getObligationPda(vault, market);

    const preInstructions = [];
    const postInstructions = [];

    const [userMetadataAccount, obligationAccount] =
      await this.client.base.provider.connection.getMultipleAccountsInfo([
        userMetadata,
        obligation,
      ]);

    // If user metadata doesn't exist, initialize it
    if (!userMetadataAccount) {
      preInstructions.push(
        await this.client.base.extKaminoProgram.methods
          .lendingInitUserMetadata(new PublicKey(0))
          .accounts({
            glamState: this.client.base.statePda,
            glamSigner,
            userMetadata,
            referrerUserMetadata: null,
          })
          .instruction(),
      );
    }

    // If obligation doesn't exist, initialize it
    if (!obligationAccount) {
      preInstructions.push(
        await this.client.base.extKaminoProgram.methods
          .lendingInitObligation(DEFAULT_OBLIGATION_ARGS)
          .accounts({
            glamState: this.client.base.statePda,
            glamSigner,
            obligation,
            lendingMarket: market,
            seed1Account: new PublicKey(0),
            seed2Account: new PublicKey(0),
            ownerUserMetadata: userMetadata,
          })
          .instruction(),
      );
    }

    const depositReserve = await this.client.findAndParseReserve(market, asset);

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        depositReserve,
        0, // collateral farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    if (obligationAccount) {
      const ixs = await this.refreshReservesAndObligationIxs(
        obligation,
        depositReserve,
      );
      preInstructions.push(...ixs);
    } else {
      // Only refresh deposit reserve
      preInstructions.push(
        ...this.refreshReservesIxs(depositReserve.market, [depositReserve]),
      );
      // Refresh obligation with 0 reserves
      preInstructions.push(
        this.refreshObligationIx({
          lendingMarket: market,
          obligation,
          reserves: [],
        }),
      );
    }

    if (depositReserve.farmCollateral) {
      const ixs = this.refreshObligationCollateralFarmsForReservesIxs(
        obligation,
        market,
        [depositReserve],
      );
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after deposit
    }

    // If deposit asset is WSOL, wrap SOL first in case vault doesn't have enough wSOL
    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.client.base.connection,
      asset,
    );
    const userSourceLiquidity = this.client.base.getVaultAta(
      asset,
      tokenProgram,
    );
    if (asset.equals(WSOL)) {
      const wrapSolIxs = await this.client.vault.maybeWrapSol(amount);
      preInstructions.unshift(...wrapSolIxs);
    }

    const ix = await this.client.base.extKaminoProgram.methods
      .lendingDepositReserveLiquidityAndObligationCollateralV2(amount)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.client.getMarketAuthority(market),
        reserve: depositReserve.address,
        reserveLiquidityMint: asset,
        reserveLiquiditySupply: depositReserve.liquiditySupplyVault,
        reserveCollateralMint: depositReserve.collateralMint,
        reserveDestinationDepositCollateral:
          depositReserve.collateralSupplyVault,
        userSourceLiquidity,
        placeholderUserDestinationCollateral: KAMINO_LENDING_PROGRAM,
        collateralTokenProgram: TOKEN_PROGRAM_ID,
        liquidityTokenProgram: tokenProgram,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        obligationFarmUserState: obligationFarmUser,
        reserveFarmState: depositReserve.farmCollateral,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .instruction();

    return [...preInstructions, ix, ...postInstructions];
  }

  public async depositTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.depositIxs(market, asset, amount, glamSigner);

    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async withdrawIxs(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const vault = this.client.base.vaultPda;
    const obligation = this.client.getObligationPda(vault, market);

    const preInstructions = [];
    const postInstructions = [];

    const withdrawReserve = await this.client.findAndParseReserve(
      market,
      asset,
    );

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        withdrawReserve,
        0, // collateral farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    const ixs = await this.refreshReservesAndObligationIxs(
      obligation,
      withdrawReserve,
    );
    preInstructions.push(...ixs);

    if (withdrawReserve.farmCollateral) {
      const ixs = this.refreshObligationCollateralFarmsForReservesIxs(
        obligation,
        market,
        [withdrawReserve],
      );
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after withdraw
    }

    // Create asset ATA in case it doesn't exist. Add it to the beginning of preInstructions
    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.client.base.provider.connection,
      asset,
    );
    const userDestinationLiquidity = this.client.base.getVaultAta(
      asset,
      tokenProgram,
    );
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
      tokenProgram,
    );
    preInstructions.unshift(createAtaIx);

    // When all assets are being withdrawn from a market, the klend program attempts to close the
    // obligation account, which requires the system program. We always pass the system program
    // account as a remaining account just in case.
    const withdrawIx = await this.client.base.extKaminoProgram.methods
      .lendingWithdrawObligationCollateralAndRedeemReserveCollateralV2(amount)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.client.getMarketAuthority(market),
        withdrawReserve: withdrawReserve.address,
        reserveLiquidityMint: asset,
        reserveSourceCollateral: withdrawReserve.collateralSupplyVault,
        reserveCollateralMint: withdrawReserve.collateralMint,
        reserveLiquiditySupply: withdrawReserve.liquiditySupplyVault,
        userDestinationLiquidity,
        placeholderUserDestinationCollateral: null,
        collateralTokenProgram: TOKEN_PROGRAM_ID,
        liquidityTokenProgram: tokenProgram,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        obligationFarmUserState: obligationFarmUser,
        reserveFarmState: withdrawReserve.farmCollateral,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .remainingAccounts([
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ])
      .instruction();

    return [...preInstructions, withdrawIx, ...postInstructions];
  }

  public async withdrawTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.withdrawIxs(market, asset, amount, glamSigner);

    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async borrowIxs(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const vault = this.client.base.vaultPda;
    const obligation = this.client.getObligationPda(vault, market);

    const preInstructions = [];
    const postInstructions = [];
    const borrowReserve = await this.client.findAndParseReserve(market, asset);

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        borrowReserve,
        1, // debt farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    const ixs = await this.refreshReservesAndObligationIxs(
      obligation,
      borrowReserve,
    );
    preInstructions.push(...ixs);

    if (borrowReserve.farmDebt) {
      const ixs = this.refreshObligationDebtFarmsForReservesIxs(
        obligation,
        market,
        [borrowReserve],
      );
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after borrow
    }

    // Create asset ATA in case it doesn't exist. Add it to the beginning of preInstructions
    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.client.base.provider.connection,
      asset,
    );
    const userDestinationLiquidity = this.client.base.getVaultAta(
      asset,
      tokenProgram,
    );
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
      tokenProgram,
    );
    preInstructions.unshift(createAtaIx);

    const borrowIx = await this.client.base.extKaminoProgram.methods
      .lendingBorrowObligationLiquidityV2(amount)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.client.getMarketAuthority(market),
        borrowReserve: borrowReserve.address,
        borrowReserveLiquidityMint: asset,
        reserveSourceLiquidity: borrowReserve.liquiditySupplyVault,
        borrowReserveLiquidityFeeReceiver: borrowReserve.feeVault,
        userDestinationLiquidity,
        referrerTokenState: null,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram,
        obligationFarmUserState: obligationFarmUser,
        reserveFarmState: borrowReserve.farmDebt,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .instruction();

    return [...preInstructions, borrowIx];
  }

  public async borrowTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.borrowIxs(market, asset, amount, glamSigner);

    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async repayIxs(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const vault = this.client.base.vaultPda;
    const obligation = this.client.getObligationPda(vault, market);

    const preInstructions = [];
    const repayReserve = await this.client.findAndParseReserve(market, asset);

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        repayReserve,
        1, // debt farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    const ixs = await this.refreshReservesAndObligationIxs(
      obligation,
      repayReserve,
    );
    preInstructions.push(...ixs);

    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.client.base.provider.connection,
      asset,
    );

    const repayIx = await this.client.base.extKaminoProgram.methods
      .lendingRepayObligationLiquidityV2(amount)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.client.getMarketAuthority(market),
        repayReserve: repayReserve.address,
        reserveLiquidityMint: asset,
        reserveDestinationLiquidity: repayReserve.liquiditySupplyVault,
        userSourceLiquidity: this.client.base.getVaultAta(asset, tokenProgram),
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram,
        obligationFarmUserState: obligationFarmUser,
        reserveFarmState: repayReserve.farmDebt,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .instruction();

    return [...preInstructions, repayIx];
  }

  public async repayTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.repayIxs(market, asset, amount, glamSigner);

    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }
}

export class KaminoLendingClient {
  private reserves: PkMap<ParsedReserve> = new PkMap();
  private obligations: PkMap<ParsedObligation> = new PkMap();
  txBuilder: TxBuilder;

  public constructor(
    readonly base: BaseClient,
    readonly vault: VaultClient,
  ) {
    this.txBuilder = new TxBuilder(this);
  }

  /**
   * Initializes Kamino user metadata
   */
  public async initUserMetadata(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.initUserMetadataTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Deposits asset to the lending market.
   */
  public async deposit(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.depositTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Withdraws asset from the lending market.
   */
  public async withdraw(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.withdrawTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Borrows asset from the lending market.
   */
  public async borrow(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.borrowTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Repays asset to the lending market.
   */
  public async repay(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.repayTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  getUserMetadataPda(owner: PublicKey) {
    const [userMetadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_meta"), owner.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    return userMetadataPda;
  }

  getObligationPda(
    owner: PublicKey,
    market: PublicKey,
    args: { tag: number; id: number } = DEFAULT_OBLIGATION_ARGS,
  ) {
    const seed = [
      Buffer.from([args.tag]),
      Buffer.from([args.id]),
      owner.toBuffer(),
      market.toBuffer(),
      PublicKey.default.toBuffer(),
      PublicKey.default.toBuffer(),
    ];
    const [obligation, _] = PublicKey.findProgramAddressSync(
      seed,
      KAMINO_LENDING_PROGRAM,
    );
    return obligation;
  }

  // seeds = [BASE_SEED_USER_STATE, farm_state.key().as_ref(), delegatee.key().as_ref()],
  getFarmUserState(farmUser: PublicKey, farm: PublicKey) {
    const [obligationFarm] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), farm.toBuffer(), farmUser.toBuffer()],
      KAMINO_FARM_PROGRAM,
    );
    return obligationFarm;
  }

  getMarketAuthority(market: PublicKey) {
    const [authority, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("lma"), market.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    return authority;
  }

  reservePdas(market: PublicKey, mint: PublicKey) {
    const [liquiditySupplyVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_liq_supply"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    const [collateralMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_coll_mint"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    const [collateralSupplyVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_coll_supply"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    const [feeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_receiver"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    return {
      liquiditySupplyVault,
      collateralMint,
      collateralSupplyVault,
      feeVault,
    };
  }

  parseObligation(obligation: PublicKey, data: Buffer): ParsedObligation {
    const {
      lendingMarket,
      deposits: _deposits,
      borrows: _borrows,
    } = Obligation.decode(obligation, data);

    const deposits = _deposits
      .filter(({ depositReserve }) => !depositReserve.equals(PublicKey.default))
      .map(({ depositReserve, depositedAmount, marketValueSf }) => {
        return {
          reserve: depositReserve,
          depositedAmount,
          marketValueSf,
        };
      });

    const borrows = _borrows
      .filter(({ borrowReserve }) => !borrowReserve.equals(PublicKey.default))
      .map(
        ({
          borrowReserve,
          borrowedAmountSf,
          marketValueSf,
          cumulativeBorrowRateBsf,
        }) => {
          return {
            reserve: borrowReserve,
            borrowedAmountSf,
            marketValueSf,
            cumulativeBorrowRateBsf,
          };
        },
      );

    return {
      address: obligation,
      lendingMarket,
      deposits,
      borrows,
    };
  }

  async fetchAndParseObligation(
    obligation: PublicKey,
  ): Promise<ParsedObligation> {
    const cached = this.obligations.get(obligation);
    if (cached) {
      return cached;
    }

    const obligationAccount =
      await this.base.provider.connection.getAccountInfo(obligation);
    if (!obligationAccount) {
      throw new Error("Obligation account not found");
    }

    const parsedObligation = this.parseObligation(
      obligation,
      obligationAccount.data,
    );

    this.obligations.set(obligation, parsedObligation);
    return parsedObligation;
  }

  parseReserve(pubkey: PublicKey, data: Buffer): ParsedReserve {
    const {
      lendingMarket,
      farmCollateral,
      farmDebt,
      liquidity: { mintPubkey, mintDecimals },
      config: {
        tokenInfo: {
          scopeConfiguration: { priceFeed },
        },
      },
      collateralExchangeRate,
      cumulativeBorrowRate,
    } = Reserve.decode(pubkey, data);

    return {
      address: pubkey,
      market: lendingMarket,
      farmCollateral: farmCollateral.equals(PublicKey.default)
        ? null
        : farmCollateral,
      farmDebt: farmDebt.equals(PublicKey.default) ? null : farmDebt,
      liquidityMint: mintPubkey,
      liquidityMintDecimals: mintDecimals.toNumber(),
      scopePriceFeed: priceFeed,
      ...this.reservePdas(lendingMarket, mintPubkey),
      collateralExchangeRate,
      cumulativeBorrowRate,
    };
  }

  async fetchAndParseReserves(reserves: PublicKey[]): Promise<ParsedReserve[]> {
    const requestReservesSet = new PkSet(reserves);
    const cachedReservesSet = new PkSet(Array.from(this.reserves.pkKeys()));

    if (cachedReservesSet.includes(requestReservesSet)) {
      return Array.from(this.reserves.values()).filter(({ address }) =>
        requestReservesSet.has(address),
      );
    }

    const reservesToFetch = Array.from(requestReservesSet).filter(
      (r) => !cachedReservesSet.has(r),
    );
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "Fetching reserves:",
        reservesToFetch.map((r) => r.toBase58()),
      );
    }

    const reserveAccounts =
      await this.base.provider.connection.getMultipleAccountsInfo(
        reservesToFetch,
      );
    if (reserveAccounts.some((a) => !a)) {
      throw new Error("Not all reserves can be found");
    }
    reserveAccounts.forEach((account, i) => {
      const parsedReserve = this.parseReserve(
        reservesToFetch[i],
        account!.data,
      );
      this.reserves.set(reservesToFetch[i], parsedReserve);
    });

    return Array.from(this.reserves.values()).filter(({ address }) =>
      requestReservesSet.has(address),
    );
  }

  async findAndParseReserve(
    market: PublicKey,
    asset: PublicKey,
  ): Promise<ParsedReserve> {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      KAMINO_LENDING_PROGRAM,
      {
        filters: [
          { dataSize: KAMINO_RESERVE_SIZE },
          { memcmp: { offset: 32, bytes: market.toBase58() } },
          { memcmp: { offset: 128, bytes: asset.toBase58() } },
        ],
      },
    );
    if (accounts.length === 0) {
      throw new Error("Reserve not found");
    }
    const parsedReserve = this.parseReserve(
      accounts[0].pubkey,
      accounts[0].account.data,
    );
    this.reserves.set(accounts[0].pubkey, parsedReserve);
    return parsedReserve;
  }

  public async findAndParseObligations(
    owner: PublicKey,
    market?: PublicKey,
  ): Promise<ParsedObligation[]> {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      KAMINO_LENDING_PROGRAM,
      {
        filters: [
          { dataSize: KAMINO_OBTRIGATION_SIZE },
          { memcmp: { offset: 64, bytes: owner.toBase58() } },
          ...(market
            ? [{ memcmp: { offset: 32, bytes: market.toBase58() } }]
            : []),
        ],
      },
    );
    return accounts.map((a) => {
      const parsedObligation = this.parseObligation(a.pubkey, a.account.data);
      this.obligations.set(a.pubkey, parsedObligation);
      return parsedObligation;
    });
  }
}
