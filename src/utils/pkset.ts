import { PublicKey } from "@solana/web3.js";

/**
 * A Set implementation that uses PublicKey as values.
 *
 * This class extends the standard Set and allows using PublicKey objects
 * as values by converting them to base58 strings internally. This solves the
 * problem of PublicKey object reference equality - two PublicKey objects
 * with the same address would normally be considered different values in a Set.
 *
 * @example
 * ```typescript
 * // Create empty set
 * const set = new PkSet();
 * const key = new PublicKey("11111111111111111111111111111111");
 * set.add(key);
 *
 * // Create with initial values
 * const set2 = new PkSet([
 *   new PublicKey("11111111111111111111111111111111"),
 *   new PublicKey("22222222222222222222222222222222")
 * ]);
 *
 * // Can check with a different PublicKey object with same address
 * const sameKey = new PublicKey("11111111111111111111111111111111");
 * console.log(set.has(sameKey)); // true
 * ```
 */
export class PkSet {
  private readonly _set = new Set<string>();

  /**
   * Creates a new PkSet instance.
   * @param values - Optional initial values as PublicKey array
   */
  constructor(values?: readonly PublicKey[] | null) {
    if (values) {
      for (const value of values) {
        this._set.add(value.toBase58());
      }
    }
  }

  /**
   * Adds the specified PublicKey to this set.
   * @param value - The PublicKey to add to the set
   * @returns This PkSet instance for chaining
   */
  add(value: PublicKey): this {
    this._set.add(value.toBase58());
    return this;
  }

  /**
   * Returns true if this set contains the specified PublicKey.
   * @param value - The PublicKey whose presence in this set is to be tested
   * @returns true if this set contains the specified PublicKey
   */
  has(value: PublicKey): boolean {
    return this._set.has(value.toBase58());
  }

  /**
   * Removes the specified PublicKey from this set if present.
   * @param value - The PublicKey to be removed
   * @returns true if the element was removed, false otherwise
   */
  delete(value: PublicKey): boolean {
    return this._set.delete(value.toBase58());
  }

  /**
   * Returns an iterator of all PublicKey values in this set.
   * Note: This reconstructs PublicKey objects from the stored base58 strings.
   * @returns An iterator of PublicKey objects
   */
  *pkValues(): IterableIterator<PublicKey> {
    for (const value of this._set.values()) {
      yield new PublicKey(value);
    }
  }

  /**
   * Executes a provided function once per each PublicKey in the Set.
   * @param callbackfn - Function to execute for each value
   * @param thisArg - Value to use as this when executing callback
   */
  forEach(
    callbackfn: (value: PublicKey, value2: PublicKey, set: PkSet) => void,
    thisArg?: any,
  ): void {
    for (const value of this.pkValues()) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  // Additional Set-like methods for compatibility
  get size(): number {
    return this._set.size;
  }

  clear(): void {
    this._set.clear();
  }

  [Symbol.iterator](): IterableIterator<PublicKey> {
    return this.pkValues();
  }

  equals(other: PkSet): boolean {
    if (this.size !== other.size) {
      return false;
    }
    for (const value of this.pkValues()) {
      if (!other.has(value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @returns true if this set contains all the PublicKeys in the other set
   */
  includes(other: PkSet): boolean {
    return [...other.pkValues()].every((value) => this.has(value));
  }
}
