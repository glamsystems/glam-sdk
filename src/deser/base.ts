import { struct } from "@coral-xyz/borsh";
import { PublicKey } from "@solana/web3.js";

/**
 * Base class for decodable on-chain account structures.
 *
 * This class provides a generic decode method that can be inherited by all
 * account deserializer classes, eliminating the need to implement the same
 * decode logic in each class.
 */
export abstract class Decodable {
  readonly _address!: PublicKey; // To avoid potential name conflict with decoded fields

  static _layout: ReturnType<typeof struct>;

  static decode<T extends Decodable>(
    this: { new (): T; _layout: ReturnType<typeof struct> },
    address: PublicKey,
    buffer: Buffer,
  ): T {
    const data = this._layout.decode(buffer);
    const instance = new this();
    Object.assign(instance, { _address: address, ...data });
    return instance;
  }

  getAddress() {
    return this._address;
  }
}
