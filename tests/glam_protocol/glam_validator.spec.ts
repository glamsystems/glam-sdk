import {
  Keypair,
  LAMPORTS_PER_SOL,
  VoteProgram,
  VoteAuthorizationLayout,
  Transaction,
  VoteInit,
} from "@solana/web3.js";
import { BN, Wallet } from "@coral-xyz/anchor";
import {
  createGlamStateForTest,
  stateModelForTest,
  str2seed,
  airdrop,
} from "./setup";
import { GlamClient, VoteAuthorize } from "../../src";

const voteKey = Keypair.fromSeed(str2seed("vote"));
const identityKey = Keypair.fromSeed(str2seed("identity"));
const identity2Key = Keypair.fromSeed(str2seed("identity2"));
const authorityKey = Keypair.fromSeed(str2seed("authority"));
const unauthorizedKey = Keypair.fromSeed(str2seed("unauthorized"));
const aclWithdrawKey = Keypair.fromSeed(str2seed("acl_withdraw"));

let glamVault;

describe("glam_validator", () => {
  const glamClient = new GlamClient();
  const glamClientUnauthz = new GlamClient({
    wallet: new Wallet(unauthorizedKey),
  });
  const glamClientWithdraw = new GlamClient({
    wallet: new Wallet(aclWithdrawKey),
  });

  describe("setup", () => {
    it("should create a new glam", async () => {
      // Create glam state with validator integration enabled
      const stateForTest = {
        ...stateModelForTest,
        integrations: [{ validator: {} }],
        delegateAcls: [
          {
            pubkey: aclWithdrawKey.publicKey,
            permissions: [{ validatorWithdraw: {} }],
            expiresAt: new BN(0),
          },
        ],
      };

      const { statePda, vaultPda, mintPda } = await createGlamStateForTest(
        glamClient,
        stateForTest,
      );
      glamVault = vaultPda;
      glamClientUnauthz.statePda = statePda;
      glamClientWithdraw.statePda = statePda;
      console.log("State PDA:", statePda.toBase58());
      console.log("Vault PDA:", vaultPda.toBase58());
      console.log("Vote account:", voteKey.publicKey.toBase58());

      // Airdrop SOL to test accounts
      await airdrop(
        glamClient.provider.connection,
        unauthorizedKey.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await airdrop(
        glamClient.provider.connection,
        aclWithdrawKey.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      await airdrop(
        glamClient.provider.connection,
        authorityKey.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
    }, 30_000);

    it("should create a new vote account", async () => {
      // Create vote account instruction
      const createVoteIx = VoteProgram.createAccount({
        fromPubkey: authorityKey.publicKey,
        votePubkey: voteKey.publicKey,
        voteInit: new VoteInit(
          voteKey.publicKey,
          identityKey.publicKey,
          authorityKey.publicKey,
          10,
        ),
        lamports: LAMPORTS_PER_SOL,
      });

      // Create and send transaction
      const transaction = new Transaction().add(createVoteIx);
      const txSig = await glamClient.sendAndConfirm(transaction, [
        authorityKey,
        voteKey,
      ]);
      console.log("Vote account created:", txSig);
    });

    it("should update vote account to use glam", async () => {
      // Create vote account instruction
      const authorizeVoteIx = VoteProgram.authorize({
        votePubkey: voteKey.publicKey,
        authorizedPubkey: authorityKey.publicKey,
        newAuthorizedPubkey: glamVault,
        voteAuthorizationType: VoteAuthorizationLayout.Withdrawer,
      });

      // Create and send transaction
      const transaction = new Transaction().add(authorizeVoteIx);
      const txSig = await glamClient.sendAndConfirm(transaction, [
        authorityKey,
      ]);
      console.log("Vote account updated:", txSig);
    });

    it("should fail to revert back to authority without glam", async () => {
      // Create vote account instruction
      const authorizeVoteIx = VoteProgram.authorize({
        votePubkey: voteKey.publicKey,
        authorizedPubkey: authorityKey.publicKey,
        newAuthorizedPubkey: authorityKey.publicKey,
        voteAuthorizationType: VoteAuthorizationLayout.Withdrawer,
      });

      // Create and send transaction
      const transaction = new Transaction().add(authorizeVoteIx);
      try {
        await glamClient.sendAndConfirm(transaction, [authorityKey]);
        throw new Error("Should have thrown an error");
      } catch (e) {
        // console.log(e);
        expect(e.message).toContain(
          "Program Vote111111111111111111111111111111111111111 failed: missing required signature for instruction",
        );
      }
    });
  });

  describe("vote_authorize", () => {
    it("should authorize a new voter authority", async () => {
      try {
        const txSig = await glamClient.validator.voteAuthorize(
          voteKey.publicKey,
          identity2Key.publicKey,
          VoteAuthorize.Voter,
        );
        console.log("Vote authorize (voter) txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should authorize a new withdrawer authority", async () => {
      try {
        const txSig = await glamClient.validator.voteAuthorize(
          voteKey.publicKey,
          authorityKey.publicKey,
          VoteAuthorize.Withdrawer,
        );
        console.log("Vote authorize (withdrawer) txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should restore vote account to use glam", async () => {
      // Create vote account instruction
      const authorizeVoteIx = VoteProgram.authorize({
        votePubkey: voteKey.publicKey,
        authorizedPubkey: authorityKey.publicKey,
        newAuthorizedPubkey: glamVault,
        voteAuthorizationType: VoteAuthorizationLayout.Withdrawer,
      });

      // Create and send transaction
      const transaction = new Transaction().add(authorizeVoteIx);
      const txSig = await glamClient.sendAndConfirm(transaction, [
        authorityKey,
      ]);
      console.log("Vote account updated:", txSig);
    });

    it("should fail without ValidatorAdmin permission", async () => {
      try {
        await glamClientUnauthz.validator.voteAuthorize(
          voteKey.publicKey,
          authorityKey.publicKey,
          { withdrawer: {} },
        );
        throw new Error("Should have thrown an error");
      } catch (e) {
        // console.log(e);
        expect(e.message).toContain("Signer is not authorized.");
      }
    });
  });

  describe("vote_update_commission", () => {
    it("should update vote account commission", async () => {
      try {
        const txSig = await glamClient.validator.voteUpdateCommission(
          voteKey.publicKey,
          5,
        );
        console.log("Vote update commission txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should update even with high commission", async () => {
      // https://github.com/anza-xyz/agave/blob/v2.3.3/programs/vote/src/vote_processor.rs#L674-L684
      try {
        const txSig = await glamClient.validator.voteUpdateCommission(
          voteKey.publicKey,
          255,
        );
        console.log("Vote update commission txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should fail without ValidatorAdmin permission", async () => {
      try {
        await glamClientUnauthz.validator.voteUpdateCommission(
          voteKey.publicKey,
          3,
        );
        throw new Error("Should have thrown an error");
      } catch (e) {
        expect(e.message).toContain("Signer is not authorized.");
      }
    });
  });

  describe("vote_update_validator_identity", () => {
    it("should update validator identity", async () => {
      try {
        const txSig = await glamClient.validator.voteUpdateValidatorIdentity(
          voteKey.publicKey,
          identity2Key,
        );
        console.log("Vote update validator identity txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should fail without ValidatorAdmin permission", async () => {
      try {
        await glamClientUnauthz.validator.voteUpdateValidatorIdentity(
          voteKey.publicKey,
          identity2Key,
        );
        throw new Error("Should have thrown an error");
      } catch (e) {
        expect(e.message).toContain("Signer is not authorized.");
      }
    });
  });

  describe("vote_withdraw", () => {
    it("should withdraw lamports to vault", async () => {
      await airdrop(
        glamClient.provider.connection,
        voteKey.publicKey,
        5 * LAMPORTS_PER_SOL,
      );

      try {
        const txSig = await glamClient.validator.voteWithdraw(
          voteKey.publicKey,
          glamVault,
          LAMPORTS_PER_SOL,
        );
        console.log("Vote withdraw to vault txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should withdraw lamports to recipient", async () => {
      try {
        const txSig = await glamClient.validator.voteWithdraw(
          voteKey.publicKey,
          glamClient.signer,
          1_000_000_000,
        );
        console.log("Vote withdraw to recipient txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should fail without ValidatorWithdraw permission", async () => {
      try {
        await glamClientUnauthz.validator.voteWithdraw(
          voteKey.publicKey,
          glamVault,
          LAMPORTS_PER_SOL,
        );
        throw new Error("Should have thrown an error");
      } catch (e) {
        expect(e.message).toContain("Signer is not authorized.");
      }
    });

    it("should fail with insufficient balance", async () => {
      try {
        await glamClient.validator.voteWithdraw(
          voteKey.publicKey,
          glamVault,
          100 * LAMPORTS_PER_SOL,
        );
        throw new Error("Should have thrown an error");
      } catch (e) {
        // console.log(e);
        expect(e.programLogs.toString()).toContain(
          "insufficient funds for instruction",
        );
      }
    });
  });

  describe("vote_withdraw ACL", () => {
    it("should withdraw to vault (ValidatorWithdraw)", async () => {
      try {
        const txSig = await glamClientWithdraw.validator.voteWithdraw(
          voteKey.publicKey,
          glamVault,
          LAMPORTS_PER_SOL,
        );
        console.log("Vote withdraw to vault (ValidatorWithdraw) txSig:", txSig);
        expect(txSig).toBeDefined();
      } catch (e) {
        console.error(e);
        throw e;
      }
    });

    it("should fail to withdraw to recipient (ValidatorWithdraw)", async () => {
      try {
        await glamClientWithdraw.validator.voteWithdraw(
          voteKey.publicKey,
          glamClientWithdraw.signer,
          LAMPORTS_PER_SOL,
        );
        throw new Error("Should have thrown an error");
      } catch (e) {
        expect(e.message).toContain("Signer is not authorized.");
      }
    });
  });
});
