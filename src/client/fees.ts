import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { PriceClient } from "./price";
import { PriceDenom } from "../models";
import { fetchMintAndTokenProgram } from "../utils/accounts";

export class FeesClient {
  public constructor(
    readonly base: BaseClient,
    readonly price: PriceClient,
  ) {}

  /**
   * Returns claimable fees object
   */
  public async getClaimableFees(): Promise<any> {
    const stateAccount = await this.base.fetchStateAccount();
    const mintParams = stateAccount.params[1];
    for (let i = 0; i < mintParams.length; i++) {
      let param = mintParams[i];
      const name = Object.keys(param.name)[0];
      // @ts-ignore
      const value = Object.values(param.value)[0].val;

      if (name === "claimableFees") {
        return value;
      }
    }

    throw new Error("Claimable fees not found");
  }

  /**
   * Returns claimed fees object
   */
  public async getClaimedFees(): Promise<any> {
    const stateAccount = await this.base.fetchStateAccount();
    const mintParams = stateAccount.params[1];
    for (let i = 0; i < mintParams.length; i++) {
      let param = mintParams[i];
      const name = Object.keys(param.name)[0];
      // @ts-ignore
      const value = Object.values(param.value)[0].val;

      if (name === "claimedFees") {
        return value;
      }
    }

    throw new Error("Claimed fees not found");
  }

  public async crystallizeFees(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const stateModel = await this.base.fetchStateModel();
    const { baseAssetMint } = stateModel;
    if (!baseAssetMint) {
      throw new Error("Base asset not found");
    }

    const postInstructions = txOptions.postInstructions || [];
    const priceVaultIxs = await this.price.priceVaultIxs();
    const createEscrowShareAtaIx =
      createAssociatedTokenAccountIdempotentInstruction(
        this.base.signer,
        this.base.getMintAta(this.base.escrowPda),
        this.base.escrowPda,
        this.base.mintPda,
        TOKEN_2022_PROGRAM_ID,
      );
    const preInstructions = [
      ...priceVaultIxs,
      createEscrowShareAtaIx,
      ...(txOptions.preInstructions || []),
    ];

    const tx = await this.base.mintProgram.methods
      .crystallizeFees()
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async claimFees(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const signer = txOptions.signer || this.base.signer;
    const stateModel = await this.base.fetchStateModel();
    const { baseAssetMint: baseAsset } = stateModel;
    if (!baseAsset) {
      throw new Error("Base asset not found");
    }

    // TODO: parse from glam config account
    const protocolFeeAuthority = new PublicKey(
      "gLJHKPrZLGBiBZ33hFgZh6YnsEhTVxuRT17UCqNp6ff",
    );
    const managerFeeAuthority = stateModel?.owner;
    if (!managerFeeAuthority) {
      throw new Error("Manager fee authority not found");
    }

    const { tokenProgram } =
      await fetchMintAndTokenProgram(this.base.provider.connection, baseAsset);

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

    const priceVaultIxs = await this.price.priceVaultIxs();
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
    const tx = await this.base.mintProgram.methods
      .claimFees()
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        protocolFeeAuthority,
        managerFeeAuthority,
        depositAsset: baseAsset,
        depositTokenProgram: tokenProgram,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async setProtocolFeesIx(
    baseFeeBps: number,
    flowFeeBps: number,
  ): Promise<TransactionInstruction> {
    return await this.base.mintProgram.methods
      .setProtocolFees(baseFeeBps, flowFeeBps)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .instruction();
  }

  public async setProtocolFees(
    baseFeeBps: number,
    flowFeeBps: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const setIx = await this.setProtocolFeesIx(baseFeeBps, flowFeeBps);
    return await this.crystallizeFees({
      ...txOptions,
      postInstructions: [setIx],
    });
  }
}
