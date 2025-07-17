import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  TOKEN_2022_PROGRAM_ID,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { TRANSFER_HOOK_PROGRAM, WSOL } from "../constants";
import { getAccountPolicyPda } from "../utils/glamPDAs";
import { PriceClient } from "./price";
import { PriceDenom } from "../models";

export class FeesClient {
  public constructor(
    readonly base: BaseClient,
    readonly price: PriceClient,
  ) {}

  public async crystallizeFees(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const stateModel = await this.base.fetchStateModel();
    const { baseAsset } = stateModel;
    if (!baseAsset) {
      throw new Error("Base asset not found");
    }

    const priceVaultIxs = await this.price.priceVaultIxs(
      PriceDenom.fromAsset(baseAsset),
    );
    const tx = await this.base.program.methods
      .crystallizeFees(0)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .preInstructions(priceVaultIxs)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async disburseFees(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const signer = txOptions.signer || this.base.getSigner();
    const stateModel = await this.base.fetchStateModel();
    const { baseAsset } = stateModel;
    if (!baseAsset) {
      throw new Error("Base asset not found");
    }

    // TODO: parse from glam config account
    const protocolFeeAuthority = new PublicKey(
      "gLJHKPrZLGBiBZ33hFgZh6YnsEhTVxuRT17UCqNp6ff",
    );
    const managerFeeAuthority = stateModel?.owner?.pubkey;
    if (!managerFeeAuthority) {
      throw new Error("Manager fee authority not found");
    }

    const { tokenProgram } =
      await this.base.fetchMintAndTokenProgram(baseAsset);

    const protocolFeeAuthorityAta = this.base.getAta(
      baseAsset,
      protocolFeeAuthority,
      tokenProgram,
    );
    const managerFeeAuthorityAta = this.base.getAta(
      baseAsset,
      managerFeeAuthority,
      tokenProgram,
    );

    const priceVaultIxs = await this.price.priceVaultIxs(
      PriceDenom.fromAsset(baseAsset),
    );
    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        protocolFeeAuthorityAta,
        protocolFeeAuthority,
        baseAsset,
        tokenProgram,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        managerFeeAuthorityAta,
        managerFeeAuthority,
        baseAsset,
        tokenProgram,
      ),
      ...priceVaultIxs,
    ];
    const tx = await this.base.program.methods
      .disburseFees(0)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        // @ts-ignore
        protocolFeeAuthorityAta,
        managerFeeAuthorityAta,
        depositAsset: baseAsset,
        depositTokenProgram: tokenProgram,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
