import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseClient, TxOptions } from "./base";
import { EmergencyAccessUpdateArgs } from "../models";

class TxBuilder {
  constructor(private base: BaseClient) {}

  async emergencyAccessUpdate(
    args: Partial<EmergencyAccessUpdateArgs>,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .emergencyAccessUpdate(new EmergencyAccessUpdateArgs(args))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async emergencyAccessUpdateIx(
    args: Partial<EmergencyAccessUpdateArgs>,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.signer;
    return await this.base.protocolProgram.methods
      .emergencyAccessUpdate(new EmergencyAccessUpdateArgs(args))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .instruction();
  }

  async enableDisableProtocols(
    integrationProgram: PublicKey,
    protocolBitmask: number,
    setEnabled: boolean,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .enableDisableProtocols(integrationProgram, protocolBitmask, setEnabled)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async grantRevokeDelegatePermissions(
    delegate: PublicKey,
    integrationProgram: PublicKey,
    protocolBitflag: number,
    permissionsBitmask: BN,
    setGranted: boolean,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .grantRevokeDelegatePermissions(
        delegate,
        integrationProgram,
        protocolBitflag,
        permissionsBitmask,
        setGranted,
      )
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async grantRevokeDelegatePermissionsIx(
    delegate: PublicKey,
    integrationProgram: PublicKey,
    protocolBitflag: number,
    permissionsBitmask: BN,
    setGranted: boolean,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.signer;
    return await this.base.protocolProgram.methods
      .grantRevokeDelegatePermissions(
        delegate,
        integrationProgram,
        protocolBitflag,
        permissionsBitmask,
        setGranted,
      )
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .instruction();
  }

  async setProtocolPolicy(
    integrationProgram: PublicKey,
    protocolBitflag: number,
    data: Buffer,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .setProtocolPolicy(integrationProgram, protocolBitflag, data)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}

export class AccessClient {
  public readonly txBuilder: TxBuilder;

  public constructor(readonly base: BaseClient) {
    this.txBuilder = new TxBuilder(base);
  }

  /**
   * Emergency access update - bypasses timelock for critical access control changes
   */
  public async emergencyAccessUpdate(
    args: Partial<EmergencyAccessUpdateArgs>,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.emergencyAccessUpdate(args, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Enable protocols for an integration program
   */
  public async enableProtocols(
    integrationProgram: PublicKey,
    protocolBitmask: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.enableDisableProtocols(
      integrationProgram,
      protocolBitmask,
      true,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Disable protocols for an integration program
   */
  public async disableProtocols(
    integrationProgram: PublicKey,
    protocolBitmask: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.enableDisableProtocols(
      integrationProgram,
      protocolBitmask,
      false,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Grant delegate permissions for a specific protocol
   */
  public async grantDelegatePermissions(
    delegate: PublicKey,
    integrationProgram: PublicKey,
    protocolBitflag: number,
    permissionsBitmask: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.grantRevokeDelegatePermissions(
      delegate,
      integrationProgram,
      protocolBitflag,
      permissionsBitmask,
      true,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Revoke delegate permissions for a specific protocol
   */
  public async revokeDelegatePermissions(
    delegate: PublicKey,
    integrationProgram: PublicKey,
    protocolBitflag: number,
    permissionsBitmask: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.grantRevokeDelegatePermissions(
      delegate,
      integrationProgram,
      protocolBitflag,
      permissionsBitmask,
      false,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Set protocol policy data for an integration
   */
  public async setProtocolPolicy(
    integrationProgram: PublicKey,
    protocolBitflag: number,
    data: Buffer,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.setProtocolPolicy(
      integrationProgram,
      protocolBitflag,
      data,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }
}
