import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  StakeProgram,
  STAKE_CONFIG_ID,
  ParsedAccountData,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { MSOL, STAKE_ACCOUNT_SIZE } from "../constants";
import { BaseClient, TxOptions } from "./base";
import { MarinadeClient } from "./marinade";
import { getStakePoolAccount } from "@solana/spl-stake-pool";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { getStakeAccountsWithStates, StakeAccountInfo } from "../utils/helpers";
import { STAKE_POOLS } from "./assets";

interface StakePoolAccountData {
  programId: PublicKey;
  depositAuthority: PublicKey;
  withdrawAuthority: PublicKey;
  poolMint: PublicKey;
  feeAccount: PublicKey;
  reserveStake: PublicKey;
  tokenProgramId: PublicKey;
  validatorList: PublicKey;
}

export class StakingClient {
  public constructor(
    readonly base: BaseClient,
    readonly marinade: MarinadeClient,
  ) {}

  /*
   * Client methods
   */

  public async unstake(
    asset: PublicKey,
    amount: number | BN,
    deactivate: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    // mSOL
    if (asset.equals(MSOL)) {
      return await this.marinade.withdrawStakeAccount(
        new BN(amount),
        deactivate,
        txOptions,
      );
    }

    // Other LSTs
    const stakePool = STAKE_POOLS.find((p) => p.mint === asset.toBase58());
    if (!stakePool) {
      throw new Error(`LST not supported: ${asset}`);
    }
    return await this.stakePoolWithdrawStake(
      stakePool.poolState,
      new BN(amount),
      deactivate,
      txOptions,
    );
  }

  public async stakePoolDepositSol(
    stakePool: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.stakePoolDepositSolTx(stakePool, amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async stakePoolDepositStake(
    stakePool: PublicKey,
    stakeAccount: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.stakePoolDepositStakeTx(
      stakePool,
      stakeAccount,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async stakePoolWithdrawStake(
    stakePool: PublicKey,
    amount: BN,
    deactivate: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.stakePoolWithdrawStakeTx(
      stakePool,
      amount,
      deactivate,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async initializeAndDelegateStake(
    vote: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.initializeAndDelegateStakeTx(vote, amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async deactivate(
    stakeAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.deactivateStakeTx(stakeAccounts, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async withdraw(
    stakeAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawStakeTx(stakeAccounts, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async merge(
    destinationStake: PublicKey,
    sourceStake: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.mergeStakeTx(
      destinationStake,
      sourceStake,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async split(
    existingStake: PublicKey,
    lamports: BN,
    txOptions: TxOptions = {},
  ): Promise<{ newStake: PublicKey; txSig: TransactionSignature }> {
    const { tx, newStake } = await this.splitStakeTx(
      existingStake,
      lamports,
      txOptions,
    );
    const txSig = await this.base.sendAndConfirm(tx);
    return { newStake, txSig };
  }

  public async redelegate(
    existingStake: PublicKey,
    vote: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<{ newStake: PublicKey; txSig: TransactionSignature }> {
    const { newStake, tx } = await this.redelegateStakeTx(
      existingStake,
      vote,
      txOptions,
    );
    const txSig = await this.base.sendAndConfirm(tx);
    return { newStake, txSig };
  }

  /*
   * Utils
   */

  getStakePoolWithdrawAuthority(programId: PublicKey, stakePool: PublicKey) {
    const [publicKey] = PublicKey.findProgramAddressSync(
      [stakePool.toBuffer(), Buffer.from("withdraw")],
      programId,
    );
    return publicKey;
  }

  getStakePoolDepositAuthority(
    programId: PublicKey,
    stakePool: PublicKey,
  ): PublicKey {
    const [publicKey] = PublicKey.findProgramAddressSync(
      [stakePool.toBuffer(), Buffer.from("deposit")],
      programId,
    );
    return publicKey;
  }

  // FIXME: this is a dupe of getStakeAccountsWithStates in utils/helpers
  async getStakeAccountsWithStates(
    withdrawAuthority?: PublicKey,
  ): Promise<StakeAccountInfo[]> {
    // stake authority offset: 12
    // withdraw authority offset: 44
    const authority = withdrawAuthority || this.base.vaultPda;
    const accounts =
      await this.base.provider.connection.getParsedProgramAccounts(
        StakeProgram.programId,
        {
          filters: [
            {
              dataSize: STAKE_ACCOUNT_SIZE,
            },
            {
              memcmp: {
                offset: 44,
                bytes: authority.toBase58(),
              },
            },
          ],
        },
      );

    const epochInfo = await this.base.provider.connection.getEpochInfo();
    const stakes = await Promise.all(
      accounts.map(async (account) => {
        const delegation = (account.account.data as ParsedAccountData).parsed
          .info.stake?.delegation;

        let state = "undelegated";

        if (!delegation) {
          return {
            address: account.pubkey,
            lamports: account.account.lamports,
            state,
          };
        }

        // possible state if delegated: active, inactive, activating, deactivating
        const { activationEpoch, deactivationEpoch, voter } = delegation;
        if (activationEpoch == epochInfo.epoch) {
          state = "activating";
        } else if (deactivationEpoch == epochInfo.epoch) {
          state = "deactivating";
        } else if (epochInfo.epoch > deactivationEpoch) {
          state = "inactive";
        } else if (epochInfo.epoch > activationEpoch) {
          state = "active";
        }

        return {
          address: account.pubkey,
          lamports: account.account.lamports,
          voter: new PublicKey(voter),
          state,
        };
      }),
    );

    // order by lamports desc
    return stakes.sort((a, b) => b.lamports - a.lamports);
  }

  async getStakeAccountVoter(
    stakeAccount: PublicKey,
  ): Promise<PublicKey | null> {
    const connection = this.base.provider.connection;
    const accountInfo = await connection.getParsedAccountInfo(stakeAccount);
    if (!accountInfo || !accountInfo.value) {
      console.warn("No account info found:", stakeAccount.toBase58());
      return null;
    }

    const delegation = (accountInfo.value.data as ParsedAccountData).parsed.info
      .stake?.delegation;
    if (!delegation) {
      console.warn("No delegation found:", stakeAccount.toBase58());
      return null;
    }

    const { voter } = delegation;
    return new PublicKey(voter);
  }

  async getStakePoolAccountData(
    stakePool: PublicKey,
  ): Promise<StakePoolAccountData> {
    // Get stake pool account data
    const stakePoolAccount = await getStakePoolAccount(
      this.base.provider.connection,
      stakePool,
    );
    const stakePoolAccountData = stakePoolAccount.account.data;
    const stakePoolProgramId = stakePoolAccount.account.owner;
    const stakePoolWithdrawAuthority = this.getStakePoolWithdrawAuthority(
      stakePoolProgramId,
      stakePool,
    );
    const stakePoolDepositAuthority = this.getStakePoolDepositAuthority(
      stakePoolProgramId,
      stakePool,
    );

    return {
      programId: stakePoolProgramId,
      depositAuthority: stakePoolDepositAuthority,
      withdrawAuthority: stakePoolWithdrawAuthority,
      poolMint: stakePoolAccountData.poolMint,
      feeAccount: stakePoolAccountData.managerFeeAccount,
      reserveStake: stakePoolAccountData.reserveStake,
      tokenProgramId: stakePoolAccountData.tokenProgramId,
      validatorList: stakePoolAccountData.validatorList,
    };
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

  /*
   * API methods
   */

  public async stakePoolDepositSolTx(
    stakePool: PublicKey,
    lamports: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const {
      programId: stakePoolProgram,
      poolMint,
      withdrawAuthority,
      feeAccount,
      tokenProgramId: tokenProgram,
      reserveStake,
    } = await this.getStakePoolAccountData(stakePool);

    const glamVault = this.base.vaultPda;
    const poolTokensTo = this.base.getVaultAta(poolMint, tokenProgram);

    console.log(`stakePool ${stakePool}, programId: ${stakePoolProgram}`);

    // @ts-ignore
    const tx = await this.base.program.methods
      .stakePoolDepositSol(lamports)
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        cpiProgram: stakePoolProgram,
        stakePool,
        stakePoolWithdrawAuthority: withdrawAuthority,
        reserveStake,
        feeAccount,
        referrerPoolTokensAccount: poolTokensTo,
        poolTokensTo,
        poolMint,
        tokenProgram,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          glamSigner,
          poolTokensTo,
          glamVault,
          poolMint,
          tokenProgram,
        ),
      ])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async stakePoolDepositStakeTx(
    stakePool: PublicKey,
    stakeAccount: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const {
      programId: stakePoolProgram,
      poolMint,
      depositAuthority,
      withdrawAuthority,
      feeAccount,
      validatorList,
      tokenProgramId: tokenProgram,
      reserveStake,
    } = await this.getStakePoolAccountData(stakePool);

    const glamVault = this.base.vaultPda;
    const poolTokensTo = this.base.getVaultAta(poolMint, tokenProgram);

    // All stake accounts owned by the stake pool withdraw authority
    const validatorStakeCandidates = await getStakeAccountsWithStates(
      this.base.provider.connection,
      withdrawAuthority,
    );

    // Find a validator stake account to use from the list of candidates.
    // The vault stake account must have the same vote address as the chosen validator stake account.
    const vote = await this.getStakeAccountVoter(stakeAccount);
    if (!vote) {
      throw new Error(
        "Stake account is undelegated. Cannot be deposited to the pool.",
      );
    }

    const validatorStakeAccount = validatorStakeCandidates.find(
      (s) => s.voter && s.voter.equals(vote),
    )?.address;
    if (!validatorStakeAccount) {
      throw new Error("Stake account cannot be deposited to the pool");
    }

    const tx = await this.base.program.methods
      .stakePoolDepositStake()
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        cpiProgram: stakePoolProgram,
        stakePool,
        stakePoolWithdrawAuthority: withdrawAuthority,
        validatorList,
        validatorStakeAccount,
        reserveStakeAccount: reserveStake,
        depositStake: stakeAccount,
        poolTokensTo,
        poolMint,
        feeAccount,
        referrerPoolTokensAccount: poolTokensTo,
        tokenProgram,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          glamSigner,
          poolTokensTo,
          glamVault,
          poolMint,
          tokenProgram,
        ),
      ])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async stakePoolWithdrawStakeTx(
    stakePool: PublicKey,
    amount: BN,
    deactivate: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const {
      programId: stakePoolProgram,
      poolMint,
      withdrawAuthority,
      feeAccount,
      tokenProgramId: tokenProgram,
      validatorList,
      reserveStake,
    } = await this.getStakePoolAccountData(stakePool);

    const poolTokensFrom = this.base.getVaultAta(poolMint, tokenProgram);

    // The reserve stake account should NOT be used for withdrawals unless we have no other options.
    const validatorStakeCandidates = (
      await getStakeAccountsWithStates(
        this.base.provider.connection,
        withdrawAuthority,
      )
    ).filter((s) => !s.address.equals(reserveStake));

    const validatorStakeAccount =
      validatorStakeCandidates.length === 0
        ? reserveStake
        : validatorStakeCandidates[0].address;

    const [stakeAccount, createStakeAccountIx] =
      await this.createStakeAccount(glamSigner);

    const postInstructions = deactivate
      ? [
          await this.base.program.methods
            .stakeDeactivate()
            .accounts({
              glamSigner,
              glamState: this.base.statePda,
              stake: stakeAccount,
            })
            .instruction(),
        ]
      : [];

    const tx = await this.base.program.methods
      .stakePoolWithdrawStake(amount)
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        cpiProgram: stakePoolProgram,
        stake: stakeAccount,
        stakePool,
        poolMint,
        poolTokensFrom,
        validatorList,
        validatorStakeAccount,
        stakePoolWithdrawAuthority: withdrawAuthority,
        feeAccount,
        tokenProgram,
      })
      .preInstructions([createStakeAccountIx])
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async initializeAndDelegateStakeTx(
    vote: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
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

    const tx = await this.base.program.methods
      .stakeDelegateStake()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        stake: stakeAccount,
        vote,
        stakeConfig: STAKE_CONFIG_ID,
      })
      .preInstructions([createStakeAccountIx, initStakeIx, fundStakeIx])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async deactivateStakeTx(
    stakeAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (stakeAccounts.length < 1) {
      throw new Error("At least one stake account is required");
    }

    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.program.methods
      .stakeDeactivate()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        stake: stakeAccounts[0],
      })
      .remainingAccounts(
        stakeAccounts.slice(1).map((a) => ({
          pubkey: a,
          isSigner: false,
          isWritable: true,
        })),
      )
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async withdrawStakeTx(
    stakeAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (stakeAccounts.length < 1) {
      throw new Error("At least one stake account is required");
    }

    let lamports = new BN(0);
    if (stakeAccounts.length === 1) {
      const accontInfo = await this.base.provider.connection.getAccountInfo(
        stakeAccounts[0],
      );
      lamports = accontInfo ? new BN(accontInfo.lamports) : new BN(0);
    }

    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.program.methods
      .stakeWithdraw(lamports)
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        stake: stakeAccounts[0],
      })
      .remainingAccounts(
        stakeAccounts.slice(1).map((a) => ({
          pubkey: a,
          isSigner: false,
          isWritable: true,
        })),
      )
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async mergeStakeTx(
    destinationStake: PublicKey,
    sourceStake: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.program.methods
      .stakeMerge()
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        destinationStake,
        sourceStake,
      })
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async splitStakeTx(
    existingStake: PublicKey,
    lamports: BN,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const [newStake, createStakeAccountIx] =
      await this.createStakeAccount(glamSigner);

    const tx = await this.base.program.methods
      .stakeSplit(lamports)
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        stake: existingStake,
        splitStake: newStake,
      })
      .preInstructions([createStakeAccountIx])
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);

    return { tx: vTx, newStake };
  }

  public async redelegateStakeTx(
    existingStake: PublicKey,
    vote: PublicKey,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const [newStake, createStakeAccountIx] =
      await this.createStakeAccount(glamSigner);

    const tx = await this.base.program.methods
      .stakeRedelegate()
      .accounts({
        glamSigner,
        glamState: this.base.statePda,
        vote,
        stake: existingStake,
        newStake,
        stakeConfig: STAKE_CONFIG_ID,
      })
      .preInstructions([createStakeAccountIx])
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);

    return { tx: vTx, newStake };
  }
}
