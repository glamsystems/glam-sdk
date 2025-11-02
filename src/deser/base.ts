import { struct } from "@coral-xyz/borsh";

/**
 * Base class for decodable on-chain account structures.
 *
 * This class provides a generic decode method that can be inherited by all
 * account deserializer classes, eliminating the need to implement the same
 * decode logic in each class.
 *
 * @example
 * ```typescript
 * export class MyAccount extends Decodable {
 *   field1!: PublicKey;
 *   field2!: BN;
 *
 *   static _layout = struct([
 *     publicKey("field1"),
 *     u64("field2"),
 *   ]);
 * }
 *
 * // Usage
 * const account = MyAccount.decode(accountData);
 * ```
 */
export abstract class Decodable {
  static _layout: ReturnType<typeof struct>;

  static decode<T extends Decodable>(
    this: { new (): T; _layout: ReturnType<typeof struct> },
    buffer: Buffer,
  ): T {
    const data = this._layout.decode(buffer);
    const instance = new this();
    Object.assign(instance, data);
    return instance;
  }
}
