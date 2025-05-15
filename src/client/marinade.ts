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
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Marinade } from "@marinade.finance/marinade-ts-sdk";

import { BaseClient, TxOptions } from "./base";
import {
  MARINADE_NATIVE_STAKE_AUTHORITY,
  MARINADE_PROGRAM_ID,
  MARINADE_TICKET_SIZE,
  MSOL,
  STAKE_ACCOUNT_SIZE,
} from "../constants";
import {
  fetchMarinadeTicketAccounts,
  getStakeAccountsWithStates,
  StakeAccountInfo,
} from "../utils/helpers";
import { StakingClient } from "./staking";

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

  public async depositNative(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositNativeTx(amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async depositStakeAccount(
    stakeAccount: PublicKey,
  ): Promise<TransactionSignature> {
    const tx = await this.depositStakeAccountTx(stakeAccount, {});
    return await this.base.sendAndConfirm(tx);
  }

  public async withdrawStakeAccount(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    return await this.withdrawStakeAccountTx(amount, txOptions);
    // const tx = await this.withdrawStakeAccountTx(amount, txOptions);
    // return await this.base.sendAndConfirm(tx);
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

  async createStakeAccount(
    signer: PublicKey,
  ): Promise<[PublicKey, TransactionInstruction]> {
    const seed = Date.now().toString();
    const stakeAccount = await PublicKey.createWithSeed(
      signer,
      seed,
      StakeProgram.programId,
    );
    const lamports =
      await this.base.provider.connection.getMinimumBalanceForRentExemption(
        STAKE_ACCOUNT_SIZE,
      );
    const createStakeAccountIx = SystemProgram.createAccountWithSeed({
      fromPubkey: signer,
      newAccountPubkey: stakeAccount,
      basePubkey: signer,
      seed,
      lamports,
      space: STAKE_ACCOUNT_SIZE,
      programId: StakeProgram.programId,
    });

    return [stakeAccount, createStakeAccountIx];
  }

  public async depositNativeTx(amount: BN, txOptions: TxOptions): Promise<any> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    // Create and fund the stake account
    const [stakeAccount, createStakeAccountIx] =
      await this.createStakeAccount(glamSigner);

    const initStakeIx = await this.base.program.methods
      .stakeInitialize()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        stake: stakeAccount,
      })
      .instruction();
    const fundStakeIx = await this.base.program.methods
      .systemTransfer(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        to: stakeAccount,
      })
      .instruction();

    // Then set stake authority to the marinade key
    const tx = await this.base.program.methods
      .stakeAuthorize(MARINADE_NATIVE_STAKE_AUTHORITY, 0)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        stake: stakeAccount,
      })
      .preInstructions([createStakeAccountIx, initStakeIx, fundStakeIx])
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

  parseAccountList(data: Buffer, itemSize: number) {
    const accounts = [];
    for (let i = 8; i < data.length; i += itemSize) {
      accounts.push(new PublicKey(data.subarray(i, i + 32)));
    }
    return accounts;
  }

  async getIndexes(
    stakeAccount: StakeAccountInfo,
    stakeList: any,
    validatorList: any,
  ) {
    if (!stakeAccount.voter) {
      throw new Error("Stake account is not delegated");
    }

    const accountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo([
        stakeList.account,
        validatorList.account,
      ]);

    if (!accountsInfo[0] || !accountsInfo[1]) {
      throw new Error(
        "Failed to get accounts info of stakeList and validatorList",
      );
    }

    const stakeIndex = this.parseAccountList(
      accountsInfo[0].data,
      56, // stakeList.itemSize, // FIXME: for some reason stakeList.itemSize is not correct
    ).findIndex((a) => a.equals(stakeAccount.address));

    const validatorIndex = this.parseAccountList(
      accountsInfo[1].data,
      61, // validatorList.itemSize, // FIXME: for some reason validatorList.itemSize is not correct
    ).findIndex((a) => a.equals(stakeAccount.voter!));

    return {
      stakeIndex,
      validatorIndex,
    };
  }

  public async withdrawStakeAccountTx(
    amount: BN,
    txOptions: TxOptions,
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const marinadeState = await new Marinade().getMarinadeState();

    // Get mariande stake withdraw authority
    const stakeWithdrawAuthority = await marinadeState.stakeWithdrawAuthority();
    const stakeDepositAuthority = await marinadeState.stakeDepositAuthority();
    const stakeList = marinadeState.state.stakeSystem.stakeList;
    const validatorList = marinadeState.state.validatorSystem.validatorList;

    // Fetch stake accounts by withdraw authority
    // Filter by state "active" does not work in localnet tests
    const stakeAccounts = await getStakeAccountsWithStates(
      this.base.provider.connection,
      stakeWithdrawAuthority,
    );

    const { stakeIndex, validatorIndex } = await this.getIndexes(
      stakeAccounts[0],
      stakeList,
      validatorList,
    );

    const burnMsolFrom = this.base.getVaultAta(MSOL);
    const newStake = Keypair.generate();

    // FIXME: why is treasuryMsolAccount not correct?
    // console.log(
    //   "treasuryMsolAccount:",
    //   marinadeState.treasuryMsolAccount.toBase58(),
    // );

    const tx = await this.base.program.methods
      .marinadeWithdrawStakeAccount(
        stakeIndex,
        validatorIndex,
        amount,
        this.base.vaultPda,
      )
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        state: marinadeState.marinadeStateAddress,
        validatorList: validatorList.account,
        stakeList: stakeList.account,
        stakeAccount: stakeAccounts[0].address,
        stakeWithdrawAuthority,
        stakeDepositAuthority,
        treasuryMsolAccount: this.getMarinadeState().treasuryMsolAccount,
        msolMint: MSOL,
        burnMsolFrom,
        splitStakeAccount: newStake.publicKey,
        splitStakeRentPayer: glamSigner,
        clock: SYSVAR_CLOCK_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        stakeProgram: StakeProgram.programId,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx, [newStake]);
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
