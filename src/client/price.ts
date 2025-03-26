import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

import { BaseClient } from "./base";

import { ASSETS_MAINNET } from "./assets";
import {
  fetchStakeAccounts,
  fetchMarinadeTicketAccounts,
} from "../utils/helpers";

export class PriceClient {
  public constructor(readonly base: BaseClient) {}

  /**
   * !! This is a convenience method that calculates the AUM of the vault based on priced assets.
   * !! It doesn't reflect the actual AUM of the vault. If the vault has not been priced or pricing data is outdated, the number is NOT meaningful.
   */
  public async getAum(glamState: PublicKey) {
    // @ts-ignore
    const glamStateAccount = await this.base.fetchStateAccount(glamState);
    let pricedAssets = [] as any[];
    glamStateAccount.params[0].forEach((param) => {
      const name = Object.keys(param.name)[0];
      if (name === "pricedAssets") {
        // @ts-ignore
        pricedAssets = Object.values(param.value)[0].val;
      }
    });
    return pricedAssets.reduce(
      (sum, p) => new BN(p.amount).add(sum),
      new BN(0),
    ) as BN;
  }

  public async priceVaultIxs(
    glamState: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const vault = this.base.getVaultPda(glamState);

    const tickets = await fetchMarinadeTicketAccounts(
      this.base.provider.connection,
      vault,
    );
    const priceTicketsIx = await this.base.program.methods
      .priceTickets()
      .accounts({
        glamState,
      })
      .remainingAccounts(
        tickets.map((t) => ({
          pubkey: t.pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .instruction();

    const stakes = await fetchStakeAccounts(
      this.base.provider.connection,
      vault,
    );
    const priceStakesIx = await this.base.program.methods
      .priceStakes()
      .accounts({
        glamState,
      })
      .remainingAccounts(
        stakes.map((s) => ({
          pubkey: s,
          isSigner: false,
          isWritable: false,
        })),
      )
      .instruction();

    const priceVaultIx = await this.base.program.methods
      .priceVault()
      .accounts({
        glamState,
      })
      .remainingAccounts(await this.remainingAccountsForPricing(glamState))
      .instruction();
    return [priceTicketsIx, priceStakesIx, priceVaultIx];
  }

  remainingAccountsForPricing = async (glamState: PublicKey) => {
    const glamStateAccount = await this.base.fetchStateAccount(glamState);
    return glamStateAccount.assets
      .map((asset) => [
        this.base.getVaultAta(glamState, asset),
        asset,
        ASSETS_MAINNET.get(asset.toBase58())?.stateAccount || new PublicKey(0),
      ])
      .flat()
      .map((a) => ({
        pubkey: a,
        isSigner: false,
        isWritable: false,
      }));
  };
}
