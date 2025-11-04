import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  Keypair,
} from "@solana/web3.js";

import { BaseClient, TxOptions } from "./base";
import {
  MESSAGE_TRANSMITTER_V2,
  TOKEN_MESSENGER_MINTER_V2,
  USDC,
  USDC_DEVNET,
} from "../constants";

export class CctpClient {
  public constructor(readonly base: BaseClient) {}

  /**
   * Bridge USDC to another chain using Circle's CCTP protocol
   *
   * @param amount Amount of USDC to bridge (in smallest units)
   * @param domain Destination domain (e.g., 0 for Ethereum, 1 for Avalanche)
   * @param recipient Recipient address on destination chain
   * @param params Additional parameters (maxFee, minFinalityThreshold)
   * @param txOptions Transaction options
   */
  public async bridgeUsdc(
    amount: BN | number,
    domain: number,
    recipient: PublicKey,
    params: { maxFee: BN; minFinalityThreshold: number },
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const [tx, keypair] = await this.bridgeUsdcTx(
      new BN(amount),
      domain,
      recipient,
      params,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx, [keypair]);
  }

  /**
   * Create transaction for bridging USDC to another chain
   *
   * @param amount Amount of USDC to bridge (in smallest units)
   * @param domain Destination domain
   * @param recipient Recipient address on destination chain
   * @param params Additional parameters
   * @param txOptions Transaction options
   * @returns Tuple of [transaction, message event keypair]
   */
  public async bridgeUsdcTx(
    amount: BN,
    domain: number,
    recipient: PublicKey,
    params: { maxFee: BN; minFinalityThreshold: number },
    txOptions: TxOptions,
  ): Promise<[VersionedTransaction, Keypair]> {
    const signer = txOptions.signer || this.base.signer;

    const usdcAddress = this.base.isMainnet ? USDC : USDC_DEVNET;
    const pdas = this.getDepositForBurnPdas(
      MESSAGE_TRANSMITTER_V2,
      TOKEN_MESSENGER_MINTER_V2,
      usdcAddress,
      domain,
    );

    const depositForBurnParams = {
      amount,
      destinationDomain: domain,
      mintRecipient: recipient,
      destinationCaller: PublicKey.default,
      ...params,
    };

    const denylistAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("denylist_account"), this.base.vaultPda.toBuffer()],
      TOKEN_MESSENGER_MINTER_V2,
    )[0];
    const messageSentEventAccountKeypair = Keypair.generate();

    const burnTokenAccount = this.base.getVaultAta(usdcAddress);

    const tx = await this.base.extCctpProgram.methods
      .depositForBurn(depositForBurnParams)
      .accounts({
        glamState: this.base.statePda,
        glamSigner: signer,
        senderAuthorityPda: pdas.authorityPda,
        burnTokenAccount,
        denylistAccount,
        messageTransmitter: pdas.messageTransmitterAccount,
        tokenMessenger: pdas.tokenMessengerAccount,
        remoteTokenMessenger: pdas.remoteTokenMessengerKey,
        tokenMinter: pdas.tokenMinterAccount,
        localToken: pdas.localToken,
        burnTokenMint: usdcAddress,
        messageSentEventData: messageSentEventAccountKeypair.publicKey,
        eventAuthority: pdas.tokenMessengerEventAuthority,
      })
      .transaction();
    return [
      await this.base.intoVersionedTransaction(tx, txOptions),
      messageSentEventAccountKeypair,
    ];
  }

  /**
   * Get all PDAs required for CCTP deposit for burn operation
   *
   * @param messageTransmitterProgram Message transmitter program ID
   * @param tokenMessengerMinterProgram Token messenger minter program ID
   * @param usdcAddress USDC mint address
   * @param destinationDomain Destination domain
   * @returns Object containing all required PDAs
   */
  private getDepositForBurnPdas(
    messageTransmitterProgram: PublicKey,
    tokenMessengerMinterProgram: PublicKey,
    usdcAddress: PublicKey,
    destinationDomain: Number,
  ) {
    const messageTransmitterAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("message_transmitter")],
      messageTransmitterProgram,
    )[0];
    const tokenMessengerAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("token_messenger")],
      tokenMessengerMinterProgram,
    )[0];
    const tokenMinterAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("token_minter")],
      tokenMessengerMinterProgram,
    )[0];
    const localToken = PublicKey.findProgramAddressSync(
      [Buffer.from("local_token"), usdcAddress.toBuffer()],
      tokenMessengerMinterProgram,
    )[0];
    const remoteTokenMessengerKey = PublicKey.findProgramAddressSync(
      [
        Buffer.from("remote_token_messenger"),
        Buffer.from(destinationDomain.toString()),
      ],
      tokenMessengerMinterProgram,
    )[0];
    const authorityPda = PublicKey.findProgramAddressSync(
      [Buffer.from("sender_authority")],
      tokenMessengerMinterProgram,
    )[0];
    const tokenMessengerEventAuthority = PublicKey.findProgramAddressSync(
      [Buffer.from("__event_authority")],
      tokenMessengerMinterProgram,
    )[0];

    return {
      messageTransmitterAccount,
      tokenMessengerAccount,
      tokenMinterAccount,
      localToken,
      remoteTokenMessengerKey,
      authorityPda,
      tokenMessengerEventAuthority,
    };
  }

  // TODO: filter by burned token mint
  async findV2Messages(sender: PublicKey) {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      MESSAGE_TRANSMITTER_V2,
      {
        filters: [
          { dataSize: 428 },
          { memcmp: { offset: 300, bytes: sender.toBase58() } },
        ],
      },
    );
    return accounts.map(({ pubkey }) => pubkey);
  }
}
