import { BN } from "@coral-xyz/anchor";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { PriceClient } from "./price";
import { PriceDenom } from "../models";

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
    const { baseAsset } = stateModel;
    if (!baseAsset) {
      throw new Error("Base asset not found");
    }

    const priceVaultIxs = await this.price.priceVaultTokensIxs(
      PriceDenom.fromAsset(baseAsset),
    );
    const preInstructions = [
      ...priceVaultIxs,
      ...(txOptions.preInstructions || []),
    ];

    const tx = await this.base.mintProgram.methods
      .crystallizeFees()
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .preInstructions(preInstructions)
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

    const priceVaultIxs = await this.price.priceVaultTokensIxs(
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
    const tx = await this.base.mintProgram.methods
      .disburseFees()
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

  public async setProtocolFees(
    baseFeeBps: number,
    flowFeeBps: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.base.mintProgram.methods
      .setProtocolFees(baseFeeBps, flowFeeBps)
      .accounts({
        glamState: this.base.statePda,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    const txSig = await this.base.sendAndConfirm(vTx);
    return txSig;
  }
}
