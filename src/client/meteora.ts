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
  Keypair,
} from "@solana/web3.js";
import DLMM, {
  binIdToBinArrayIndex,
  BinLiquidity,
  deriveBinArray,
  Strategy,
  RemainingAccountInfo,
  RemainingAccountsInfoSlice,
} from "@meteora-ag/dlmm";

import { BaseClient, TxOptions } from "./base";
import { USDC, WSOL } from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const METEORA_DLMM = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
);
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

const SOL_USDC_MARKET = new PublicKey(
  "5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6",
);

// Pubkey::find_program_address(&[b"__event_authority"], &dlmm_interface::ID)
const EVENT_AUTHORITY = new PublicKey(
  "D1ZN9Wj1fRSUQfCjhvnu1hqDMT7hzjzBBpi12nVniYD6",
);

const DEFAULT_RANGE_INTERVAL = 34; // 34 bins on each side of the active bin, 69 bins in total

export class MeteoraDlmmClient {
  private _dlmmPool: Map<string, DLMM> = new Map();

  public constructor(readonly base: BaseClient) {}

  public async getDlmmPool(pool: PublicKey | string): Promise<DLMM> {
    const key = typeof pool === "string" ? pool : pool.toString();
    if (!this._dlmmPool.get(key)) {
      this._dlmmPool.set(
        key,
        await DLMM.create(this.base.provider.connection, new PublicKey(pool)),
      );
    }
    const dlmmPool = this._dlmmPool.get(key);
    if (!dlmmPool) {
      throw new Error(`DLMM pool ${key} not found`);
    }
    return dlmmPool;
  }

  public async initializePosition(
    statePda: PublicKey | string,
    pool: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamState = new PublicKey(statePda);

    const dlmmPool = await this.getDlmmPool(pool);
    const activeBin = await dlmmPool.getActiveBin();
    const minBinId = activeBin.binId - DEFAULT_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + DEFAULT_RANGE_INTERVAL;

    const position = Keypair.generate();

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmInitializePosition(minBinId, maxBinId - minBinId + 1)
      .accounts({
        glamState,
        lbPair: new PublicKey(pool),
        position: position.publicKey,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx, [position]);
  }

  public async initializePositionPda(
    statePda: PublicKey | string,
    pool: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamState = new PublicKey(statePda);

    const dlmmPool = await this.getDlmmPool(pool);
    const activeBin = await dlmmPool.getActiveBin();
    const minBinId = activeBin.binId - DEFAULT_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + DEFAULT_RANGE_INTERVAL;
    const width = maxBinId - minBinId + 1;

    const position = this.getPositionPda(
      new PublicKey(pool),
      this.base.getVaultPda(glamState),
      minBinId,
      width,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmInitializePositionPda(minBinId, width)
      .accounts({
        glamState,
        lbPair: new PublicKey(pool),
        position,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async addLiquidityByStrategy(
    statePda: PublicKey | string,
    position: PublicKey | string,
    amountX: BN | number,
    amountY: BN | number,
    strategyType: keyof typeof Strategy,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const { lbPair, lowerBinId, upperBinId, binArrayLower, binArrayUpper } =
      await this.parsePosition(new PublicKey(position));

    const dlmmPool = await this.getDlmmPool(lbPair);
    const activeBinId = (await dlmmPool.getActiveBin()).binId;

    const glamState = new PublicKey(statePda);
    const glamVault = this.base.getVaultPda(glamState);
    const vaultTokenXAta = this.base.getAta(
      dlmmPool.tokenX.publicKey,
      glamVault,
    );
    const vaultTokenYAta = this.base.getAta(
      dlmmPool.tokenY.publicKey,
      glamVault,
    );

    const liquidityParameter = {
      amountX: new BN(amountX),
      amountY: new BN(amountY),
      activeId: activeBinId,
      maxActiveBinSlippage: 20,
      strategyParameters: {
        minBinId: lowerBinId,
        maxBinId: upperBinId,
        strategyType: Strategy[strategyType],
        parameteres: Array(64).fill(0),
      },
    };

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        vaultTokenYAta,
        glamVault,
        dlmmPool.tokenY.publicKey,
      ),
    ];

    const remainingAccounts = [binArrayLower, binArrayUpper].map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    // TODO: if token X or Y program is token2022 we need to properly constrcut the slides
    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmAddLiquidityByStrategy2(liquidityParameter, { slices: [] })
      .accounts({
        glamState,
        position: new PublicKey(position),
        lbPair,
        binArrayBitmapExtension: dlmmPool.binArrayBitmapExtension
          ? dlmmPool.binArrayBitmapExtension.publicKey
          : METEORA_DLMM,
        userTokenX: vaultTokenXAta,
        userTokenY: vaultTokenYAta,
        reserveX: dlmmPool.tokenX.reserve,
        reserveY: dlmmPool.tokenY.reserve,
        tokenXMint: dlmmPool.tokenX.publicKey,
        tokenYMint: dlmmPool.tokenY.publicKey,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM,
      })
      .preInstructions(preInstructions)
      .remainingAccounts(remainingAccounts)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return this.base.sendAndConfirm(vTx);
  }

  public async removeLiquidityByRange(
    statePda: PublicKey | string,
    position: PublicKey | string,
    bpsToRemove: number,
    txOptions: TxOptions = {},
  ) {
    const { lbPair, lowerBinId, upperBinId, binArrayLower, binArrayUpper } =
      await this.parsePosition(new PublicKey(position));
    const dlmmPool = await this.getDlmmPool(lbPair);

    const glamState = new PublicKey(statePda);
    const vaultTokenXAta = this.base.getVaultAta(
      glamState,
      dlmmPool.tokenX.publicKey,
    );
    const vaultTokenYAta = this.base.getVaultAta(
      glamState,
      dlmmPool.tokenY.publicKey,
    );
    const remainingAccounts = [binArrayLower, binArrayUpper].map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    const tx = await this.base.program.methods
      .meteoraDlmmRemoveLiquidityByRange2(lowerBinId, upperBinId, bpsToRemove, {
        slices: [],
      })
      .accounts({
        glamState,
        position: new PublicKey(position),
        lbPair,
        binArrayBitmapExtension: dlmmPool.binArrayBitmapExtension
          ? dlmmPool.binArrayBitmapExtension.publicKey
          : METEORA_DLMM,
        userTokenX: vaultTokenXAta,
        userTokenY: vaultTokenYAta,
        reserveX: dlmmPool.tokenX.reserve,
        reserveY: dlmmPool.tokenY.reserve,
        tokenXMint: dlmmPool.tokenX.publicKey,
        tokenYMint: dlmmPool.tokenY.publicKey,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        memoProgram: MEMO_PROGRAM_ID,
        program: METEORA_DLMM,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return this.base.sendAndConfirm(vTx);
  }

  public async claimFee(
    statePda: PublicKey | string,
    position: PublicKey | string,
    txOptions: TxOptions = {},
  ) {
    const { lbPair, lowerBinId, upperBinId, binArrayLower, binArrayUpper } =
      await this.parsePosition(new PublicKey(position));
    const dlmmPool = await this.getDlmmPool(lbPair);

    const glamState = new PublicKey(statePda);
    const vaultTokenXAta = this.base.getVaultAta(
      glamState,
      dlmmPool.tokenX.publicKey,
    );
    const vaultTokenYAta = this.base.getVaultAta(
      glamState,
      dlmmPool.tokenY.publicKey,
    );
    const remainingAccounts = [binArrayLower, binArrayUpper].map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    const tx = await this.base.program.methods
      .meteoraDlmmClaimFee2(lowerBinId, upperBinId, { slices: [] })
      .accounts({
        glamState,
        position: new PublicKey(position),
        lbPair,
        reserveX: dlmmPool.tokenX.reserve,
        reserveY: dlmmPool.tokenY.reserve,
        userTokenX: vaultTokenXAta,
        userTokenY: vaultTokenYAta,
        tokenXMint: dlmmPool.tokenX.publicKey,
        tokenYMint: dlmmPool.tokenY.publicKey,
        tokenProgramX: TOKEN_PROGRAM_ID,
        tokenProgramY: TOKEN_PROGRAM_ID,
        memoProgram: MEMO_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async closePosition(
    statePda: PublicKey | string,
    position: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const { lbPair, binArrayLower, binArrayUpper } = await this.parsePosition(
      new PublicKey(position),
    );
    const glamState = new PublicKey(statePda);

    console.log(
      `close position: ${position}, binArrayLower: ${binArrayLower}, binArrayUpper: ${binArrayUpper}`,
    );

    const tx = await this.base.program.methods
      .meteoraDlmmClosePosition()
      .accounts({
        glamState,
        position: new PublicKey(position),
        lbPair,
        binArrayLower,
        binArrayUpper,
        rentReceiver: this.base.getSigner(),
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);

    return await this.base.sendAndConfirm(vTx);
  }

  getPositionPda(
    lbPair: PublicKey,
    base: PublicKey,
    lowerBinId: number, // i32
    width: number, // i32
  ) {
    const lowerBinIdBuffer = new Uint8Array(4);
    const lowerBinIdView = new DataView(lowerBinIdBuffer.buffer);
    lowerBinIdView.setInt32(0, lowerBinId, true); // true for little-endian

    const widthBuffer = new Uint8Array(4);
    const widthView = new DataView(widthBuffer.buffer);
    widthView.setInt32(0, width, true); // true for little-endian

    const [pda, _] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        lbPair.toBuffer(),
        base.toBuffer(),
        lowerBinIdBuffer,
        widthBuffer,
      ],
      METEORA_DLMM,
    );
    return pda;
  }

  async fetchPositions(owner: PublicKey) {
    const accounts =
      await this.base.provider.connection.getParsedProgramAccounts(
        METEORA_DLMM,
        {
          filters: [
            {
              dataSize: 8120,
            },
            {
              memcmp: {
                offset: 40,
                bytes: owner.toBase58(),
              },
            },
          ],
        },
      );
    return accounts.map((a) => a.pubkey);
  }

  async parsePosition(position: PublicKey) {
    const positionAccountInfo =
      await this.base.provider.connection.getAccountInfo(position);
    if (!positionAccountInfo) {
      throw new Error("Position not found");
    }
    const positionData = positionAccountInfo.data;

    const lbPair = new PublicKey(positionData.subarray(8, 40));
    const lowerBinId = positionData.subarray(7912, 7916).readInt32LE();
    const upperBinId = positionData.subarray(7916, 7920).readInt32LE();

    const lowerBinArrayIndex = binIdToBinArrayIndex(new BN(lowerBinId));
    const [binArrayLower] = deriveBinArray(
      lbPair,
      lowerBinArrayIndex,
      METEORA_DLMM,
    );

    const upperBinArrayIndex = BN.max(
      lowerBinArrayIndex.add(new BN(1)),
      binIdToBinArrayIndex(new BN(upperBinId)),
    );
    const [binArrayUpper] = deriveBinArray(
      lbPair,
      upperBinArrayIndex,
      METEORA_DLMM,
    );

    return {
      lowerBinId,
      upperBinId,
      binArrayLower,
      binArrayUpper,
      lbPair,
    };
  }

  async autoFillY(dlmmPool: DLMM, amountX: BN) {
    const activeBin = await dlmmPool.getActiveBin();
    const activeBinPricePerToken = dlmmPool.fromPricePerLamport(
      Number(activeBin.price),
    );
    const amountY = amountX.mul(new BN(Number(activeBinPricePerToken)));
    return { amountX, amountY, activeBinId: activeBin.binId };
  }
}
