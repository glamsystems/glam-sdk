import { PublicKey } from "@solana/web3.js";
import { PkSet } from "../../src/utils/pkset";

describe("PkSet", () => {
  const testKey1 = new PublicKey("11111111111111111111111111111111");
  const testKey2 = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const testKey3 = new PublicKey("SysvarC1ock11111111111111111111111111111111");

  describe("Basic operations", () => {
    it("should add values", () => {
      const set = new PkSet();
      set.add(testKey1);

      expect(set.has(testKey1)).toBe(true);
      expect(set.size).toBe(1);
    });

    it("should handle multiple values", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);
      set.add(testKey3);

      expect(set.has(testKey1)).toBe(true);
      expect(set.has(testKey2)).toBe(true);
      expect(set.has(testKey3)).toBe(true);
      expect(set.size).toBe(3);
    });

    it("should not add duplicate values", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey1);

      expect(set.size).toBe(1);
    });

    it("should support method chaining", () => {
      const set = new PkSet();
      const result = set.add(testKey1).add(testKey2);

      expect(result).toBe(set);
      expect(set.size).toBe(2);
    });
  });

  describe("PublicKey equality", () => {
    it("should treat different PublicKey objects with same address as equal", () => {
      const set = new PkSet();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      set.add(key1);
      expect(set.has(key2)).toBe(true);
      expect(set.size).toBe(1);
    });

    it("should treat PublicKey objects with different addresses as different", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);

      expect(set.has(testKey1)).toBe(true);
      expect(set.has(testKey2)).toBe(true);
      expect(set.size).toBe(2);
    });

    it("should not add duplicate when using different PublicKey objects with same address", () => {
      const set = new PkSet();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      set.add(key1);
      set.add(key2);

      expect(set.size).toBe(1);
    });
  });

  describe("has()", () => {
    it("should return true for existing values", () => {
      const set = new PkSet();
      set.add(testKey1);

      expect(set.has(testKey1)).toBe(true);
    });

    it("should return false for non-existent values", () => {
      const set = new PkSet();
      expect(set.has(testKey1)).toBe(false);
    });

    it("should work with different PublicKey objects with same address", () => {
      const set = new PkSet();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      set.add(key1);
      expect(set.has(key2)).toBe(true);
    });
  });

  describe("delete()", () => {
    it("should delete existing values", () => {
      const set = new PkSet();
      set.add(testKey1);

      expect(set.delete(testKey1)).toBe(true);
      expect(set.has(testKey1)).toBe(false);
      expect(set.size).toBe(0);
    });

    it("should return false when deleting non-existent values", () => {
      const set = new PkSet();
      expect(set.delete(testKey1)).toBe(false);
    });

    it("should work with different PublicKey objects with same address", () => {
      const set = new PkSet();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      set.add(key1);
      expect(set.delete(key2)).toBe(true);
      expect(set.has(key1)).toBe(false);
    });

    it("should only delete the specified value", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);
      set.add(testKey3);

      set.delete(testKey2);

      expect(set.has(testKey1)).toBe(true);
      expect(set.has(testKey2)).toBe(false);
      expect(set.has(testKey3)).toBe(true);
      expect(set.size).toBe(2);
    });
  });

  describe("clear()", () => {
    it("should remove all values", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);
      set.add(testKey3);

      set.clear();

      expect(set.size).toBe(0);
      expect(set.has(testKey1)).toBe(false);
      expect(set.has(testKey2)).toBe(false);
      expect(set.has(testKey3)).toBe(false);
    });

    it("should work on empty set", () => {
      const set = new PkSet();
      set.clear();
      expect(set.size).toBe(0);
    });
  });

  describe("pkValues()", () => {
    it("should iterate over all PublicKey values", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);
      set.add(testKey3);

      const values = Array.from(set.pkValues());
      expect(values).toHaveLength(3);

      const valueStrings = values.map((k) => k.toBase58()).sort();
      const expectedStrings = [
        testKey1.toBase58(),
        testKey2.toBase58(),
        testKey3.toBase58(),
      ].sort();

      expect(valueStrings).toEqual(expectedStrings);
    });

    it("should return empty iterator for empty set", () => {
      const set = new PkSet();
      const values = Array.from(set.pkValues());
      expect(values).toHaveLength(0);
    });

    it("should return reconstructed PublicKey objects", () => {
      const set = new PkSet();
      set.add(testKey1);

      const values = Array.from(set.pkValues());
      expect(values[0]).toBeInstanceOf(PublicKey);
      expect(values[0].toBase58()).toBe(testKey1.toBase58());
    });
  });

  describe("forEach()", () => {
    it("should iterate over all values", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);

      const results: PublicKey[] = [];
      set.forEach((value) => {
        results.push(value);
      });

      expect(results).toHaveLength(2);

      const resultStrings = results.map((k) => k.toBase58()).sort();
      const expectedStrings = [testKey1.toBase58(), testKey2.toBase58()].sort();

      expect(resultStrings).toEqual(expectedStrings);
    });

    it("should pass value twice as per Set.forEach signature", () => {
      const set = new PkSet();
      set.add(testKey1);

      set.forEach((value1, value2) => {
        expect(value1.toBase58()).toBe(value2.toBase58());
        expect(value1.toBase58()).toBe(testKey1.toBase58());
      });
    });

    it("should pass correct context", () => {
      const set = new PkSet();
      set.add(testKey1);

      set.forEach(function (this: any, value1, value2, s) {
        expect(s).toBe(set);
      });
    });

    it("should respect thisArg", () => {
      const set = new PkSet();
      set.add(testKey1);

      const context = { test: "context" };
      set.forEach(function (this: any) {
        expect(this).toBe(context);
      }, context);
    });

    it("should not execute for empty set", () => {
      const set = new PkSet();
      let executed = false;

      set.forEach(() => {
        executed = true;
      });

      expect(executed).toBe(false);
    });
  });

  describe("Constructor", () => {
    it("should create empty set when no values provided", () => {
      const set = new PkSet();
      expect(set.size).toBe(0);
    });

    it("should create set with initial values", () => {
      const values: PublicKey[] = [testKey1, testKey2, testKey3];
      const set = new PkSet(values);

      expect(set.size).toBe(3);
      expect(set.has(testKey1)).toBe(true);
      expect(set.has(testKey2)).toBe(true);
      expect(set.has(testKey3)).toBe(true);
    });

    it("should handle null values parameter", () => {
      const set = new PkSet(null);
      expect(set.size).toBe(0);
    });

    it("should work with different PublicKey objects for same address in initial values", () => {
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");
      const set = new PkSet([key1]);

      expect(set.has(key2)).toBe(true);
      expect(set.size).toBe(1);
    });

    it("should handle duplicate values in constructor", () => {
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");
      const set = new PkSet([key1, key2, testKey2]);

      expect(set.size).toBe(2);
      expect(set.has(key1)).toBe(true);
      expect(set.has(testKey2)).toBe(true);
    });
  });

  describe("Symbol.iterator", () => {
    it("should be iterable with for...of loop", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);

      const values: PublicKey[] = [];
      for (const value of set) {
        values.push(value);
      }

      expect(values).toHaveLength(2);
      const valueStrings = values.map((k) => k.toBase58()).sort();
      const expectedStrings = [testKey1.toBase58(), testKey2.toBase58()].sort();
      expect(valueStrings).toEqual(expectedStrings);
    });

    it("should work with spread operator", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);

      const values = [...set];
      expect(values).toHaveLength(2);
    });

    it("should work with Array.from", () => {
      const set = new PkSet();
      set.add(testKey1);
      set.add(testKey2);
      set.add(testKey3);

      const values = Array.from(set);
      expect(values).toHaveLength(3);

      const valueStrings = values.map((k) => k.toBase58()).sort();
      const expectedStrings = [
        testKey1.toBase58(),
        testKey2.toBase58(),
        testKey3.toBase58(),
      ].sort();

      expect(valueStrings).toEqual(expectedStrings);
    });

    it("should work with destructuring", () => {
      const set = new PkSet([testKey1, testKey2]);
      const [first, second] = set;

      expect(first).toBeInstanceOf(PublicKey);
      expect(second).toBeInstanceOf(PublicKey);

      const addresses = [first.toBase58(), second.toBase58()].sort();
      const expected = [testKey1.toBase58(), testKey2.toBase58()].sort();
      expect(addresses).toEqual(expected);
    });
  });

  describe("Edge cases", () => {
    it("should handle the default PublicKey", () => {
      const set = new PkSet();
      const defaultKey = PublicKey.default;
      set.add(defaultKey);

      expect(set.has(defaultKey)).toBe(true);
      expect(set.size).toBe(1);
    });

    it("should handle large number of values", () => {
      const set = new PkSet();
      const keys: PublicKey[] = [];

      // Create 100 random keys
      for (let i = 0; i < 100; i++) {
        const key = new PublicKey(
          Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)),
        );
        keys.push(key);
        set.add(key);
      }

      expect(set.size).toBe(100);

      // Verify all keys are in the set
      keys.forEach((key) => {
        expect(set.has(key)).toBe(true);
      });
    });

    it("should maintain uniqueness with many duplicate additions", () => {
      const set = new PkSet();

      // Add the same key 100 times
      for (let i = 0; i < 100; i++) {
        set.add(testKey1);
      }

      expect(set.size).toBe(1);
      expect(set.has(testKey1)).toBe(true);
    });
  });

  describe("Set operations", () => {
    it("should support union-like operations", () => {
      const set1 = new PkSet([testKey1, testKey2]);
      const set2 = new PkSet([testKey2, testKey3]);

      // Manual union
      const union = new PkSet([...set1, ...set2]);

      expect(union.size).toBe(3);
      expect(union.has(testKey1)).toBe(true);
      expect(union.has(testKey2)).toBe(true);
      expect(union.has(testKey3)).toBe(true);
    });

    it("should support intersection-like operations", () => {
      const set1 = new PkSet([testKey1, testKey2]);
      const set2 = new PkSet([testKey2, testKey3]);

      // Manual intersection
      const intersection = new PkSet();
      for (const value of set1) {
        if (set2.has(value)) {
          intersection.add(value);
        }
      }

      expect(intersection.size).toBe(1);
      expect(intersection.has(testKey2)).toBe(true);
      expect(intersection.has(testKey1)).toBe(false);
      expect(intersection.has(testKey3)).toBe(false);
    });

    it("should support difference-like operations", () => {
      const set1 = new PkSet([testKey1, testKey2]);
      const set2 = new PkSet([testKey2, testKey3]);

      // Manual difference (set1 - set2)
      const difference = new PkSet();
      for (const value of set1) {
        if (!set2.has(value)) {
          difference.add(value);
        }
      }

      expect(difference.size).toBe(1);
      expect(difference.has(testKey1)).toBe(true);
      expect(difference.has(testKey2)).toBe(false);
    });
  });

  describe("Conversion", () => {
    it("should convert to array", () => {
      const set = new PkSet([testKey1, testKey2, testKey3]);
      const array = Array.from(set);

      expect(array).toBeInstanceOf(Array);
      expect(array).toHaveLength(3);

      const addresses = array.map((k) => k.toBase58()).sort();
      const expected = [
        testKey1.toBase58(),
        testKey2.toBase58(),
        testKey3.toBase58(),
      ].sort();

      expect(addresses).toEqual(expected);
    });

    it("should convert from array", () => {
      const array = [testKey1, testKey2, testKey3];
      const set = new PkSet(array);

      expect(set.size).toBe(3);
      array.forEach((key) => {
        expect(set.has(key)).toBe(true);
      });
    });
  });
});
