import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  ParsedAccountData,
  TransactionSignature,
  StakeProgram,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Marinade,
  MarinadeConfig,
  MarinadeState,
} from "@marinade.finance/marinade-ts-sdk";

import { BaseClient, TxOptions } from "./base";
import {
  MARINADE_NATIVE_STAKE_AUTHORITY,
  MSOL,
  STAKE_ACCOUNT_SIZE,
} from "../constants";
import {
  getStakeAccountsWithStates,
  StakeAccountInfo,
} from "../utils/accounts";
import { ClusterNetwork } from "../clientConfig";

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
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(new BN(amount), txOptions);
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
    deactivate: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const [tx, extraSigner] = await this.withdrawStakeAccountTx(
      amount,
      deactivate,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx, [extraSigner]);
  }

  /*
   * Utils
   */

  /**
   * @deprecated Use Marinade.getMarinadeState() instead
   */
  get marinadeStateStatic() {
    // The addresses are the same in mainnet and devnet:
    // https://docs.marinade.finance/developers/contract-addresses
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

  async fetchMarinadeState(): Promise<MarinadeState> {
    const marinade = new Marinade(
      new MarinadeConfig({
        connection: this.base.provider.connection,
      }),
    );
    return await marinade.getMarinadeState();
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
        `${stakeAccount} is not a stake account. Account size ${
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
    const glamSigner = txOptions.signer || this.base.signer;
    const vault = this.base.vaultPda;
    const marinadeState = this.marinadeStateStatic;
    const vaultMsolAta = this.base.getVaultAta(marinadeState.msolMintAddress);

    const createMsolAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      vaultMsolAta,
      vault,
      marinadeState.msolMintAddress,
    );

    const tx = await this.base.extMarinadeProgram.methods
      .deposit(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        state: marinadeState.marinadeStateAddress,
        msolMint: marinadeState.msolMintAddress,
        liqPoolSolLegPda: marinadeState.solLeg,
        liqPoolMsolLeg: marinadeState.msolLeg,
        liqPoolMsolLegAuthority: marinadeState.msolLegAuthority,
        reservePda: marinadeState.reserveAddress,
        mintTo: vaultMsolAta,
        msolMintAuthority: marinadeState.mSolMintAuthority,
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
    const glamSigner = txOptions.signer || this.base.signer;
    // Create and fund the stake account
    const [stakeAccount, createStakeAccountIx] =
      await this.createStakeAccount(glamSigner);

    const initStakeIx = await this.base.protocolProgram.methods
      // @ts-ignore
      .stakeInitialize()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        stake: stakeAccount,
      })
      .instruction();
    const fundStakeIx = await this.base.protocolProgram.methods
      .systemTransfer(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        to: stakeAccount,
      })
      .instruction();

    // Then set stake authority to the marinade key
    const tx = await this.base.protocolProgram.methods
      // @ts-ignore
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
    const glamSigner = txOptions.signer || this.base.signer;

    const stakeAccountInfo = await this.getParsedStakeAccountInfo(stakeAccount);

    const marinadeState = await this.fetchMarinadeState();
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

    const tx = await this.base.extMarinadeProgram.methods
      .depositStakeAccount(validatorIndex)
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
      stakeList.itemSize,
    ).findIndex((a) => a.equals(stakeAccount.address));

    const validatorIndex = this.parseAccountList(
      accountsInfo[1].data,
      validatorList.itemSize,
    ).findIndex((a) => a.equals(stakeAccount.voter!));

    return {
      stakeIndex,
      validatorIndex,
    };
  }

  public async withdrawStakeAccountTx(
    amount: BN,
    deactivate: boolean = false,
    txOptions: TxOptions,
  ): Promise<[VersionedTransaction, Keypair]> {
    const glamSigner = txOptions.signer || this.base.signer;
    const marinadeState = await this.fetchMarinadeState();

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

    const idx =
      this.base.cluster === ClusterNetwork.Mainnet
        ? stakeAccounts.findIndex((s) => s.state === "active")
        : 0;

    const { stakeIndex, validatorIndex } = await this.getIndexes(
      stakeAccounts[idx],
      stakeList,
      validatorList,
    );

    const burnMsolFrom = this.base.getVaultAta(MSOL);
    const newStake = Keypair.generate();

    const postInstructions = deactivate
      ? [
          await this.base.protocolProgram.methods
            // @ts-ignore
            .stakeDeactivate()
            .accounts({
              glamSigner,
              glamState: this.base.statePda,
              stake: newStake.publicKey,
            })
            .instruction(),
        ]
      : [];

    const tx = await this.base.extMarinadeProgram.methods
      .withdrawStakeAccount(
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
        stakeAccount: stakeAccounts[idx].address,
        stakeWithdrawAuthority,
        stakeDepositAuthority,
        treasuryMsolAccount: marinadeState.treasuryMsolAccount,
        msolMint: MSOL,
        burnMsolFrom,
        splitStakeAccount: newStake.publicKey,
        clock: SYSVAR_CLOCK_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        stakeProgram: StakeProgram.programId,
      })
      .postInstructions(postInstructions)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);

    return [vTx, newStake];
  }
}
