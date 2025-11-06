import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  Keypair,
  Commitment,
  Finality,
} from "@solana/web3.js";

import { BaseClient, TxOptions } from "./base";
import {
  MESSAGE_TRANSMITTER_V2,
  TOKEN_MESSENGER_MINTER_V2,
  USDC,
  USDC_DEVNET,
} from "../constants";
import { toUiAmount } from "../utils";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const EMIT_CPI_IX_DISCM = new Uint8Array([
  0xe4, 0x45, 0xa5, 0x2e, 0x51, 0xcb, 0x9a, 0x1d,
]);
const MESSAGE_RECEIVED_EVENT_DISCM = new Uint8Array([
  0xe7, 0x44, 0x2f, 0x4d, 0xad, 0xf1, 0x9d, 0xa6,
]);

export class CctpBridgeEvent {
  readonly uiAmount!: number;

  constructor(
    readonly amount: BN,
    readonly sourceDomain: number,
    readonly sourceAddress: string,
    readonly destinationDomain: number,
    readonly destinationAddress: string,
    readonly attestation: string,
    readonly nonce: string,
    readonly status: string,
  ) {
    this.uiAmount = toUiAmount(this.amount, 6);
  }
}

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
  async findV2Messages(
    sender: PublicKey,
    options: {
      commitment?: Commitment;
      minSlot?: number;
    },
  ) {
    const accounts = await this.base.connection.getProgramAccounts(
      MESSAGE_TRANSMITTER_V2,
      {
        ...(options.commitment ? { commitment: options.commitment } : {}),
        ...(options.minSlot ? { minContextSlot: options.minSlot } : {}),
        filters: [
          { dataSize: 428 },
          { memcmp: { offset: 300, bytes: sender.toBase58() } },
        ],
      },
    );
    return accounts.map(({ pubkey }) => pubkey);
  }

  async fromAttestion(
    sourceDomain: number,
    { txHash, nonce }: { txHash?: string; nonce?: string },
  ): Promise<CctpBridgeEvent[]> {
    if (!txHash && !nonce) {
      throw new Error("txHash or nonce is required");
    }

    const queryParams = new URLSearchParams();
    if (txHash) {
      queryParams.set("transactionHash", txHash);
    } else if (nonce) {
      queryParams.set("nonce", nonce);
    }

    const events = [];
    const resonse = await fetch(
      `https://iris-api.circle.com/v2/messages/${sourceDomain}?${queryParams.toString()}`,
    );
    const { messages } = await resonse.json();
    for (const message of messages) {
      const attestation = message.attestation;
      const status = message.status;
      const nonce = message.decodedMessage.nonce;
      const destinationDomain = Number(
        message.decodedMessage.destinationDomain,
      );
      const destinationAddress =
        message.decodedMessage.decodedMessageBody.mintRecipient;
      const sourceAddress =
        message.decodedMessage.decodedMessageBody.messageSender;
      const amount = message.decodedMessage.decodedMessageBody.amount;
      const token = message.decodedMessage.decodedMessageBody.burnToken;

      events.push(
        new CctpBridgeEvent(
          new BN(amount),
          sourceDomain,
          sourceAddress,
          destinationDomain,
          destinationAddress,
          attestation,
          nonce,
          status,
        ),
      );
    }
    return events;
  }

  /**
   * Get incoming bridge events (EVM -> Solana)
   *
   * Unlike outgoing bridge events, incoming bridge events are not stored in Message accounts on Solana.
   * We need to examine all transactions to find the ones that contain the bridge events.
   * 1. Fetch all transactions involing the vault's USDC token account
   * 2. Filter transactions that contain the bridge events
   * 3. Parse the bridge events from the transactions
   *
   * @param options
   */
  async getIncomingBridgeEvents(options: {
    batchSize?: number;
    commitment?: Finality;
    txHashes?: string[];
    minSlot?: number;
  }): Promise<CctpBridgeEvent[]> {
    const { batchSize = 1, commitment = "confirmed", minSlot } = options;

    const txHashes = new Set<string>(options.txHashes ?? []);

    // If no txHashes provided, find transactions involving vault's USDC token account
    if (txHashes.size === 0) {
      const signatures = await this.base.connection.getSignaturesForAddress(
        this.base.getVaultAta(USDC),
        { ...(minSlot ? { minContextSlot: minSlot } : {}) },
        commitment,
      );
      signatures.forEach((sig) => txHashes.add(sig.signature));
    }

    if (txHashes.size === 0) {
      return [];
    }

    const allEvents: CctpBridgeEvent[] = [];
    const txHashArray = Array.from(txHashes);

    // Process transactions in batches
    for (let i = 0; i < txHashArray.length; i += batchSize) {
      const batch = txHashArray.slice(i, i + batchSize);
      const transactionPromises = batch.map((txHash) =>
        this.base.connection.getTransaction(txHash, {
          maxSupportedTransactionVersion: 0,
        }),
      );

      const transactions = await Promise.all(transactionPromises);

      // Parse each transaction for CCTP bridge events
      for (let j = 0; j < transactions.length; j++) {
        const tx = transactions[j];
        const txHash = batch[j];

        if (!tx || !tx.meta) continue;

        // Look for CCTP program logs indicating incoming bridge
        const logs = tx.meta.logMessages || [];
        const cctpLogs = logs.filter(
          (log) =>
            log.includes(
              "Program CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC invoke",
            ) || log.includes("ReceiveMessage"),
        );

        if (cctpLogs.length === 0) {
          continue;
        }

        // This is a potential incoming bridge transaction
        // Parse the transaction data to extract bridge event details
        const sourceAndNonce: [number, string][] = [];
        for (const innerInstruction of tx?.meta?.innerInstructions ?? []) {
          for (const { data } of innerInstruction.instructions) {
            const bytes = Buffer.from(bs58.decode(data));
            if (
              !bytes.subarray(0, 8).equals(EMIT_CPI_IX_DISCM) ||
              !bytes.subarray(8, 16).equals(MESSAGE_RECEIVED_EVENT_DISCM)
            ) {
              continue;
            }

            const sourceDomain = bytes.readUInt32LE(48);
            const nonce = "0x" + bytes.subarray(52, 84).toString("hex");

            sourceAndNonce.push([sourceDomain, nonce]);
          }
        }

        // Fetch all messages from Circle API
        for (const [sourceDomain, nonce] of sourceAndNonce) {
          const events = await this.fromAttestion(sourceDomain, {
            nonce,
          });
          allEvents.push(...events);
        }
      }
    }

    return allEvents;
  }

  /**
   * Get outgoing bridge events (Solana -> EVM)
   *
   * Each transfer has a Message account on Solana. To get all events:
   * 1. Find all Message accounts for the vault
   * 2. Get the created transaction for each message account
   * 3. Call iris api to get the attestation status and parsed message using each tx hash
   *
   * @param options
   */
  async getOutgoingBridgeEvents(options: {
    batchSize?: number;
    commitment?: Commitment;
    txHashes?: string[];
    minSlot?: number;
  }): Promise<CctpBridgeEvent[]> {
    const { batchSize = 1, commitment = "confirmed", minSlot } = options;

    const txHashes = new Set<string>(options.txHashes ?? []);

    // If no txHashes are provided, find all message accounts for the vault
    if (txHashes.size === 0) {
      const messagePubkeys = await this.findV2Messages(this.base.vaultPda, {
        commitment,
        minSlot,
      });

      if (messagePubkeys.length === 0) {
        return [];
      }

      for (let i = 0; i < messagePubkeys.length; i += batchSize) {
        const batch = messagePubkeys.slice(i, i + batchSize);
        const signaturesPromises = batch.map((pubkey) =>
          this.base.connection.getSignaturesForAddress(pubkey),
        );
        const batchSignatures = await Promise.all(signaturesPromises);

        // Process batch results and collect transaction signatures
        for (let j = 0; j < batch.length; j++) {
          const sigs = batchSignatures[j];
          const createdTx = sigs.sort((a, b) => a.slot - b.slot)[0];
          txHashes.add(createdTx.signature);
        }
      }
    }

    const allEvents: CctpBridgeEvent[] = [];
    for (const txHash of txHashes) {
      const events = await this.fromAttestion(5, { txHash });
      allEvents.push(...events);
    }

    return allEvents;
  }
}
