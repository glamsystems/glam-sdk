import { BN } from "@coral-xyz/anchor";
import { PublicKey, TransactionSignature, Keypair } from "@solana/web3.js";
import DLMM, { Strategy } from "@meteora-ag/dlmm";

import { BaseClient, TxOptions } from "./base";
import { MEMO_PROGRAM, METEORA_DLMM_PROGRAM } from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { parseMeteoraPosition } from "../utils/helpers";

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
    pool: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const dlmmPool = await this.getDlmmPool(pool);
    const activeBin = await dlmmPool.getActiveBin();
    const minBinId = activeBin.binId - DEFAULT_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + DEFAULT_RANGE_INTERVAL;

    const position = Keypair.generate();

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmInitializePosition(minBinId, maxBinId - minBinId + 1)
      .accounts({
        glamState: this.base.statePda,
        lbPair: new PublicKey(pool),
        position: position.publicKey,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM_PROGRAM,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx, [position]);
  }

  public async initializePositionPda(
    pool: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const dlmmPool = await this.getDlmmPool(pool);
    const activeBin = await dlmmPool.getActiveBin();
    const minBinId = activeBin.binId - DEFAULT_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + DEFAULT_RANGE_INTERVAL;
    const width = maxBinId - minBinId + 1;

    const position = this.getPositionPda(
      new PublicKey(pool),
      this.base.vaultPda,
      minBinId,
      width,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmInitializePositionPda(minBinId, width)
      .accounts({
        glamState: this.base.statePda,
        lbPair: new PublicKey(pool),
        position,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM_PROGRAM,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async addLiquidityByStrategy(
    position: PublicKey | string,
    amountX: BN | number,
    amountY: BN | number,
    strategyType: keyof typeof Strategy,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const { lbPair, lowerBinId, upperBinId, binArrayLower, binArrayUpper } =
      await parseMeteoraPosition(
        this.base.provider.connection,
        new PublicKey(position),
      );

    const dlmmPool = await this.getDlmmPool(lbPair);
    const activeBinId = (await dlmmPool.getActiveBin()).binId;

    const glamVault = this.base.vaultPda;
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
        glamState: this.base.statePda,
        position: new PublicKey(position),
        lbPair,
        binArrayBitmapExtension: dlmmPool.binArrayBitmapExtension
          ? dlmmPool.binArrayBitmapExtension.publicKey
          : METEORA_DLMM_PROGRAM,
        userTokenX: vaultTokenXAta,
        userTokenY: vaultTokenYAta,
        reserveX: dlmmPool.tokenX.reserve,
        reserveY: dlmmPool.tokenY.reserve,
        tokenXMint: dlmmPool.tokenX.publicKey,
        tokenYMint: dlmmPool.tokenY.publicKey,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM_PROGRAM,
      })
      .preInstructions(preInstructions)
      .remainingAccounts(remainingAccounts)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return this.base.sendAndConfirm(vTx);
  }

  public async removeLiquidityByRange(
    position: PublicKey | string,
    bpsToRemove: number,
    txOptions: TxOptions = {},
  ) {
    const { lbPair, lowerBinId, upperBinId, binArrayLower, binArrayUpper } =
      await parseMeteoraPosition(
        this.base.provider.connection,
        new PublicKey(position),
      );
    const dlmmPool = await this.getDlmmPool(lbPair);

    const vaultTokenXAta = this.base.getVaultAta(dlmmPool.tokenX.publicKey);
    const vaultTokenYAta = this.base.getVaultAta(dlmmPool.tokenY.publicKey);
    const remainingAccounts = [binArrayLower, binArrayUpper].map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmRemoveLiquidityByRange2(lowerBinId, upperBinId, bpsToRemove, {
        slices: [],
      })
      .accounts({
        glamState: this.base.statePda,
        position: new PublicKey(position),
        lbPair,
        binArrayBitmapExtension: dlmmPool.binArrayBitmapExtension
          ? dlmmPool.binArrayBitmapExtension.publicKey
          : METEORA_DLMM_PROGRAM,
        userTokenX: vaultTokenXAta,
        userTokenY: vaultTokenYAta,
        reserveX: dlmmPool.tokenX.reserve,
        reserveY: dlmmPool.tokenY.reserve,
        tokenXMint: dlmmPool.tokenX.publicKey,
        tokenYMint: dlmmPool.tokenY.publicKey,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTHORITY,
        memoProgram: MEMO_PROGRAM,
        program: METEORA_DLMM_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return this.base.sendAndConfirm(vTx);
  }

  public async claimFee(
    position: PublicKey | string,
    txOptions: TxOptions = {},
  ) {
    const { lbPair, lowerBinId, upperBinId, binArrayLower, binArrayUpper } =
      await parseMeteoraPosition(
        this.base.provider.connection,
        new PublicKey(position),
      );
    const dlmmPool = await this.getDlmmPool(lbPair);

    const vaultTokenXAta = this.base.getVaultAta(dlmmPool.tokenX.publicKey);
    const vaultTokenYAta = this.base.getVaultAta(dlmmPool.tokenY.publicKey);
    const remainingAccounts = [binArrayLower, binArrayUpper].map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmClaimFee2(lowerBinId, upperBinId, { slices: [] })
      .accounts({
        glamState: this.base.statePda,
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
        memoProgram: MEMO_PROGRAM,
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async closePosition(
    position: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const { lbPair, binArrayLower, binArrayUpper } = await parseMeteoraPosition(
      this.base.provider.connection,
      new PublicKey(position),
    );

    console.log(
      `close position: ${position}, binArrayLower: ${binArrayLower}, binArrayUpper: ${binArrayUpper}`,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .meteoraDlmmClosePosition()
      .accounts({
        glamState: this.base.statePda,
        position: new PublicKey(position),
        lbPair,
        binArrayLower,
        binArrayUpper,
        rentReceiver: this.base.getSigner(),
        eventAuthority: EVENT_AUTHORITY,
        program: METEORA_DLMM_PROGRAM,
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
      METEORA_DLMM_PROGRAM,
    );
    return pda;
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
