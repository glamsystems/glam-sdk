import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  ParsedAccountData,
  TransactionSignature,
  StakeProgram,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Marinade } from "@marinade.finance/marinade-ts-sdk";

import { BaseClient, TxOptions } from "./base";
import { MARINADE_PROGRAM_ID, MARINADE_TICKET_SIZE, MSOL } from "../constants";
import { fetchMarinadeTicketAccounts } from "../utils/helpers";

export type Ticket = {
  address: PublicKey; // offset 8 after anchor discriminator
  lamports: number;
  createdEpoch: number;
  isDue: boolean;
  isClaimable: boolean; // >30min since the start of the current epoch
};

export class MarinadeClient {
  public constructor(readonly base: BaseClient) {}

  /*
   * Client methods
   */

  public async deposit(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async depositStakeAccount(
    stakeAccount: PublicKey,
  ): Promise<TransactionSignature> {
    const tx = await this.depositStakeAccountTx(stakeAccount, {});
    return await this.base.sendAndConfirm(tx);
  }

  public async orderUnstake(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.orderUnstakeTx(amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async claim(
    tickets: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.claimTx(tickets, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /*
   * Utils
   */

  async getTickets(): Promise<PublicKey[]> {
    const vault = this.base.vaultPda;
    const accounts = await fetchMarinadeTicketAccounts(
      this.base.provider.connection,
      vault,
    );
    return accounts.map((a) => a.pubkey);
  }

  async getParsedTickets(): Promise<Ticket[]> {
    const vault = this.base.vaultPda;
    const accounts = await fetchMarinadeTicketAccounts(
      this.base.provider.connection,
      vault,
    );

    const currentEpoch = await this.base.provider.connection.getEpochInfo();
    return accounts.map((a) => {
      const lamports = Number((a.account.data as Buffer).readBigInt64LE(72));
      const createdEpoch = Number(
        (a.account.data as Buffer).readBigInt64LE(80),
      );
      const isDue = currentEpoch.epoch > createdEpoch;
      return {
        address: a.pubkey,
        lamports,
        createdEpoch,
        isDue,
        isClaimable: isDue && currentEpoch.slotIndex > 5000, // 5000 slots ~= 33.3 minutes
      };
    });
  }

  getMarinadeState() {
    // The addresses are the same in mainnet and devnet:
    // https://docs.marinade.finance/developers/contract-addresses
    // TODO: use marinade.getMarinadeState(); ?
    return {
      marinadeStateAddress: new PublicKey(
        "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC",
      ),
      msolMintAddress: MSOL,
      treasuryMsolAccount: new PublicKey(
        "B1aLzaNMeFVAyQ6f3XbbUyKcH2YPHu2fqiEagmiF23VR",
      ),
      reserveAddress: new PublicKey(
        "Du3Ysj1wKbxPKkuPPnvzQLQh8oMSVifs3jGZjJWXFmHN",
      ),
      mSolMintAuthority: new PublicKey(
        "3JLPCS1qM2zRw3Dp6V4hZnYHd4toMNPkNesXdX9tg6KM",
      ),
      msolLeg: new PublicKey("7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE"),
      msolLegAuthority: new PublicKey(
        "EyaSjUtSgo9aRD1f8LWXwdvkpDTmXAW54yoSHZRF14WL",
      ),
      solLeg: new PublicKey("UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q"),
    };
  }

  async getParsedStakeAccountInfo(stakeAccount: PublicKey): Promise<any> {
    const { value: stakeAccountInfo } =
      await this.base.provider.connection.getParsedAccountInfo(stakeAccount);
    if (!stakeAccountInfo) {
      throw new Error(
        `Failed to find the stake account ${stakeAccount.toBase58()}`,
      );
    }

    if (!stakeAccountInfo.owner.equals(StakeProgram.programId)) {
      throw new Error(
        `${stakeAccount.toBase58()} is not a stake account because owner is ${
          stakeAccountInfo.owner
        }`,
      );
    }

    const parsedData = stakeAccountInfo?.data as ParsedAccountData;
    const balanceLamports = stakeAccountInfo.lamports;
    const stakedLamports =
      parsedData?.parsed?.info?.stake?.delegation?.stake ?? null;

    if (parsedData.space != 200) {
      throw new Error(
        `${stakeAccount.toBase58()} is not a stake account because space is ${
          parsedData.space
        } != 200`,
      );
    }

    return {
      voter: new PublicKey(parsedData.parsed.info?.stake?.delegation?.voter),
      balanceLamports,
      stakedLamports,
    };
  }

  /*
   * API methods
   */

  public async depositTx(
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;
    const marinadeState = this.getMarinadeState();
    const vaultMsolAta = this.base.getVaultAta(marinadeState.msolMintAddress);

    const createMsolAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      vaultMsolAta,
      vault,
      marinadeState.msolMintAddress,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .marinadeDeposit(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        reservePda: marinadeState.reserveAddress,
        state: marinadeState.marinadeStateAddress,
        msolMint: marinadeState.msolMintAddress,
        msolMintAuthority: marinadeState.mSolMintAuthority,
        liqPoolMsolLeg: marinadeState.msolLeg,
        liqPoolMsolLegAuthority: marinadeState.msolLegAuthority,
        liqPoolSolLegPda: marinadeState.solLeg,
        mintTo: vaultMsolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([createMsolAtaIx])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async depositStakeAccountTx(
    stakeAccount: PublicKey,
    txOptions: TxOptions,
  ): Promise<any> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const stakeAccountInfo = await this.getParsedStakeAccountInfo(stakeAccount);
    console.log("Stake account info", stakeAccountInfo);

    const marinadeState = await new Marinade().getMarinadeState();
    const { validatorRecords } = await marinadeState.getValidatorRecords();
    const validatorLookupIndex = validatorRecords.findIndex(
      ({ validatorAccount }) => validatorAccount.equals(stakeAccountInfo.voter),
    );
    const validatorIndex =
      validatorLookupIndex === -1
        ? marinadeState.state.validatorSystem.validatorList.count
        : validatorLookupIndex;

    const duplicationFlag = await marinadeState.validatorDuplicationFlag(
      stakeAccountInfo.voter,
    );

    const tx = await this.base.program.methods
      .marinadeDepositStakeAccount(validatorIndex)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        state: marinadeState.marinadeStateAddress,
        validatorList:
          marinadeState.state.validatorSystem.validatorList.account,
        stakeList: marinadeState.state.stakeSystem.stakeList.account,
        stakeAccount,
        duplicationFlag,
        msolMint: MSOL,
        msolMintAuthority: await marinadeState.mSolMintAuthority(),
        mintTo: this.base.getVaultAta(MSOL),
        clock: SYSVAR_CLOCK_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        stakeProgram: StakeProgram.programId,
      })
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async orderUnstakeTx(
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const marinadeState = this.getMarinadeState();
    const vaultMsolAta = this.base.getVaultAta(marinadeState.msolMintAddress);

    const ticketSeed = Date.now().toString();
    const ticket = await PublicKey.createWithSeed(
      glamSigner,
      ticketSeed,
      MARINADE_PROGRAM_ID,
    );
    const lamports =
      await this.base.provider.connection.getMinimumBalanceForRentExemption(
        MARINADE_TICKET_SIZE,
      );
    const createTicketIx = SystemProgram.createAccountWithSeed({
      fromPubkey: glamSigner,
      newAccountPubkey: ticket,
      basePubkey: glamSigner,
      seed: ticketSeed,
      lamports,
      space: MARINADE_TICKET_SIZE,
      programId: MARINADE_PROGRAM_ID,
    });
    const tx = await this.base.program.methods
      .marinadeOrderUnstake(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        newTicketAccount: ticket,
        msolMint: marinadeState.msolMintAddress,
        burnMsolFrom: vaultMsolAta,
        state: marinadeState.marinadeStateAddress,
        clock: SYSVAR_CLOCK_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([createTicketIx])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimTx(
    tickets: PublicKey[],
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    if (tickets.length < 1) {
      throw new Error("At least one ticket is required");
    }

    const glamSigner = txOptions.signer || this.base.getSigner();
    const marinadeState = this.getMarinadeState();

    const instructions = await Promise.all(
      tickets.map((ticket) =>
        this.base.program.methods
          .marinadeClaim()
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            ticketAccount: ticket,
            state: marinadeState.marinadeStateAddress,
            reservePda: marinadeState.reserveAddress,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .instruction(),
      ),
    );
    const tx = new Transaction();
    tx.add(...instructions);

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
