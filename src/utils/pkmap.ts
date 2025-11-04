import { PublicKey } from "@solana/web3.js";

/**
 * A Map implementation that uses PublicKey as keys.
 *
 * This class extends the standard Map and allows using PublicKey objects
 * as keys by converting them to base58 strings internally. This solves the
 * problem of PublicKey object reference equality - two PublicKey objects
 * with the same address would normally be considered different keys in a Map.
 *
 * @example
 * ```typescript
 * // Create empty map
 * const map = new PkMap<string>();
 * const key = new PublicKey("11111111111111111111111111111111");
 * map.set(key, "value");
 *
 * // Create with initial entries
 * const map2 = new PkMap<string>([
 *   [new PublicKey("11111111111111111111111111111111"), "value1"],
 *   [new PublicKey("22222222222222222222222222222222"), "value2"]
 * ]);
 *
 * // Can retrieve with a different PublicKey object with same address
 * const sameKey = new PublicKey("11111111111111111111111111111111");
 * console.log(map.get(sameKey)); // "value"
 * ```
 */
export class PkMap<V> {
  private readonly _map = new Map<string, V>();

  /**
   * Creates a new PkMap instance.
   * @param entries - Optional initial entries as [PublicKey, V] pairs
   */
  constructor(entries?: readonly (readonly [PublicKey, V])[] | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this._map.set(key.toBase58(), value);
      }
    }
  }
  /**
   * Associates the specified value with the specified PublicKey in this map.
   * @param key - The PublicKey to use as the key
   * @param value - The value to associate with the key
   * @returns This PkMap instance for chaining
   */
  set(key: PublicKey, value: V): this {
    this._map.set(key.toBase58(), value);
    return this;
  }

  /**
   * Returns the value associated with the specified PublicKey, or undefined if not found.
   * @param key - The PublicKey whose associated value is to be returned
   * @returns The value associated with the specified key, or undefined
   */
  get(key: PublicKey): V | undefined {
    return this._map.get(key.toBase58());
  }

  /**
   * Returns true if this map contains a mapping for the specified PublicKey.
   * @param key - The PublicKey whose presence in this map is to be tested
   * @returns true if this map contains a mapping for the specified key
   */
  has(key: PublicKey): boolean {
    return this._map.has(key.toBase58());
  }

  /**
   * Removes the mapping for the specified PublicKey from this map if present.
   * @param key - The PublicKey whose mapping is to be removed
   * @returns true if the element was removed, false otherwise
   */
  delete(key: PublicKey): boolean {
    return this._map.delete(key.toBase58());
  }

  /**
   * Returns an iterator of all PublicKey keys in this map.
   * Note: This reconstructs PublicKey objects from the stored base58 strings.
   * @returns An iterator of PublicKey objects
   */
  *pkKeys(): IterableIterator<PublicKey> {
    for (const key of this._map.keys()) {
      yield new PublicKey(key);
    }
  }

  /**
   * Returns an iterator of [PublicKey, value] pairs for every entry in the map.
   * Note: This reconstructs PublicKey objects from the stored base58 strings.
   * @returns An iterator of [PublicKey, V] tuples
   */
  *pkEntries(): IterableIterator<[PublicKey, V]> {
    for (const [key, value] of this._map.entries()) {
      yield [new PublicKey(key), value];
    }
  }

  /**
   * Executes a provided function once per each PublicKey/value pair in the Map.
   * @param callbackfn - Function to execute for each entry
   * @param thisArg - Value to use as this when executing callback
   */
  forEachPk(
    callbackfn: (value: V, key: PublicKey, map: PkMap<V>) => void,
    thisArg?: any,
  ): void {
    for (const [key, value] of this.pkEntries()) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  // Additional Map-like methods for compatibility
  get size(): number {
    return this._map.size;
  }

  clear(): void {
    this._map.clear();
  }

  values(): IterableIterator<V> {
    return this._map.values();
  }

  [Symbol.iterator](): IterableIterator<[PublicKey, V]> {
    return this.pkEntries();
  }
}
