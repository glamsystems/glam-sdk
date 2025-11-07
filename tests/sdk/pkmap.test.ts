import { PublicKey } from "@solana/web3.js";
import { PkMap } from "../../src/utils/pkmap";

describe("PkMap", () => {
  const testKey1 = new PublicKey("11111111111111111111111111111111");
  const testKey2 = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const testKey3 = new PublicKey("SysvarC1ock11111111111111111111111111111111");

  describe("Basic operations", () => {
    it("should set and get values with PublicKey", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");

      expect(map.get(testKey1)).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      const map = new PkMap<string>();
      expect(map.get(testKey1)).toBeUndefined();
    });

    it("should handle multiple key-value pairs", () => {
      const map = new PkMap<number>();
      map.set(testKey1, 1);
      map.set(testKey2, 2);
      map.set(testKey3, 3);

      expect(map.get(testKey1)).toBe(1);
      expect(map.get(testKey2)).toBe(2);
      expect(map.get(testKey3)).toBe(3);
      expect(map.size).toBe(3);
    });

    it("should overwrite existing values", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "initial");
      map.set(testKey1, "updated");

      expect(map.get(testKey1)).toBe("updated");
      expect(map.size).toBe(1);
    });

    it("should support method chaining", () => {
      const map = new PkMap<string>();
      const result = map.set(testKey1, "value1").set(testKey2, "value2");

      expect(result).toBe(map);
      expect(map.size).toBe(2);
    });
  });

  describe("PublicKey equality", () => {
    it("should treat different PublicKey objects with same address as equal", () => {
      const map = new PkMap<string>();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      map.set(key1, "value");
      expect(map.get(key2)).toBe("value");
      expect(map.size).toBe(1);
    });

    it("should treat PublicKey objects with different addresses as different", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");

      expect(map.get(testKey1)).toBe("value1");
      expect(map.get(testKey2)).toBe("value2");
      expect(map.size).toBe(2);
    });
  });

  describe("has()", () => {
    it("should return true for existing keys", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value");

      expect(map.has(testKey1)).toBe(true);
    });

    it("should return false for non-existent keys", () => {
      const map = new PkMap<string>();
      expect(map.has(testKey1)).toBe(false);
    });

    it("should work with different PublicKey objects with same address", () => {
      const map = new PkMap<string>();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      map.set(key1, "value");
      expect(map.has(key2)).toBe(true);
    });
  });

  describe("delete()", () => {
    it("should delete existing keys", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value");

      expect(map.delete(testKey1)).toBe(true);
      expect(map.has(testKey1)).toBe(false);
      expect(map.size).toBe(0);
    });

    it("should return false when deleting non-existent keys", () => {
      const map = new PkMap<string>();
      expect(map.delete(testKey1)).toBe(false);
    });

    it("should work with different PublicKey objects with same address", () => {
      const map = new PkMap<string>();
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");

      map.set(key1, "value");
      expect(map.delete(key2)).toBe(true);
      expect(map.has(key1)).toBe(false);
    });
  });

  describe("clear()", () => {
    it("should remove all entries", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");
      map.set(testKey3, "value3");

      map.clear();

      expect(map.size).toBe(0);
      expect(map.has(testKey1)).toBe(false);
      expect(map.has(testKey2)).toBe(false);
      expect(map.has(testKey3)).toBe(false);
    });
  });

  describe("pkKeys()", () => {
    it("should iterate over all PublicKey keys", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");
      map.set(testKey3, "value3");

      const keys = Array.from(map.pkKeys());
      expect(keys).toHaveLength(3);

      const keyStrings = keys.map((k) => k.toBase58()).sort();
      const expectedStrings = [
        testKey1.toBase58(),
        testKey2.toBase58(),
        testKey3.toBase58(),
      ].sort();

      expect(keyStrings).toEqual(expectedStrings);
    });

    it("should return empty iterator for empty map", () => {
      const map = new PkMap<string>();
      const keys = Array.from(map.pkKeys());
      expect(keys).toHaveLength(0);
    });
  });

  describe("pkEntries()", () => {
    it("should iterate over all [PublicKey, value] pairs", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");

      const entries = Array.from(map.pkEntries());
      expect(entries).toHaveLength(2);

      const entryMap = new Map(entries.map(([k, v]) => [k.toBase58(), v]));
      expect(entryMap.get(testKey1.toBase58())).toBe("value1");
      expect(entryMap.get(testKey2.toBase58())).toBe("value2");
    });

    it("should return empty iterator for empty map", () => {
      const map = new PkMap<string>();
      const entries = Array.from(map.pkEntries());
      expect(entries).toHaveLength(0);
    });
  });

  describe("forEach()", () => {
    it("should iterate over all entries with PublicKey keys", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");

      const results: [PublicKey, string][] = [];
      map.forEach((value, key) => {
        results.push([key, value]);
      });

      expect(results).toHaveLength(2);

      const resultMap = new Map(results.map(([k, v]) => [k.toBase58(), v]));
      expect(resultMap.get(testKey1.toBase58())).toBe("value1");
      expect(resultMap.get(testKey2.toBase58())).toBe("value2");
    });

    it("should pass correct context", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");

      map.forEach(function (this: any, value, key, m) {
        expect(m).toBe(map);
      });
    });

    it("should respect thisArg", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");

      const context = { test: "context" };
      map.forEach(function (this: any) {
        expect(this).toBe(context);
      }, context);
    });

    it("should not execute for empty map", () => {
      const map = new PkMap<string>();
      let executed = false;

      map.forEach(() => {
        executed = true;
      });

      expect(executed).toBe(false);
    });
  });

  describe("Complex value types", () => {
    it("should handle object values", () => {
      interface TestObject {
        id: number;
        name: string;
      }

      const map = new PkMap<TestObject>();
      const obj1 = { id: 1, name: "test1" };
      const obj2 = { id: 2, name: "test2" };

      map.set(testKey1, obj1);
      map.set(testKey2, obj2);

      expect(map.get(testKey1)).toEqual(obj1);
      expect(map.get(testKey2)).toEqual(obj2);
    });

    it("should handle array values", () => {
      const map = new PkMap<number[]>();
      map.set(testKey1, [1, 2, 3]);
      map.set(testKey2, [4, 5, 6]);

      expect(map.get(testKey1)).toEqual([1, 2, 3]);
      expect(map.get(testKey2)).toEqual([4, 5, 6]);
    });

    it("should handle null and undefined values", () => {
      const map = new PkMap<string | null | undefined>();
      map.set(testKey1, null);
      map.set(testKey2, undefined);
      map.set(testKey3, "value");

      expect(map.get(testKey1)).toBeNull();
      expect(map.get(testKey2)).toBeUndefined();
      expect(map.get(testKey3)).toBe("value");
      expect(map.has(testKey1)).toBe(true);
      expect(map.has(testKey2)).toBe(true);
    });
  });

  describe("Constructor", () => {
    it("should create empty map when no entries provided", () => {
      const map = new PkMap<string>();
      expect(map.size).toBe(0);
    });

    it("should create map with initial entries", () => {
      const entries: [PublicKey, string][] = [
        [testKey1, "value1"],
        [testKey2, "value2"],
        [testKey3, "value3"],
      ];
      const map = new PkMap(entries);

      expect(map.size).toBe(3);
      expect(map.get(testKey1)).toBe("value1");
      expect(map.get(testKey2)).toBe("value2");
      expect(map.get(testKey3)).toBe("value3");
    });

    it("should handle null entries parameter", () => {
      const map = new PkMap<string>(null);
      expect(map.size).toBe(0);
    });

    it("should work with different PublicKey objects for same address in initial entries", () => {
      const key1 = new PublicKey("11111111111111111111111111111111");
      const key2 = new PublicKey("11111111111111111111111111111111");
      const map = new PkMap([[key1, "value"]]);

      expect(map.get(key2)).toBe("value");
      expect(map.has(key2)).toBe(true);
    });
  });

  describe("Symbol.iterator", () => {
    it("should be iterable with for...of loop", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");

      const entries: [PublicKey, string][] = [];
      for (const [key, value] of map) {
        entries.push([key, value]);
      }

      expect(entries).toHaveLength(2);
      const entryMap = new Map(entries.map(([k, v]) => [k.toBase58(), v]));
      expect(entryMap.get(testKey1.toBase58())).toBe("value1");
      expect(entryMap.get(testKey2.toBase58())).toBe("value2");
    });

    it("should work with spread operator", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");

      const entries = [...map];
      expect(entries).toHaveLength(2);
    });

    it("should work with Array.from", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");
      map.set(testKey3, "value3");

      const entries = Array.from(map);
      expect(entries).toHaveLength(3);

      const entryMap = new Map(entries.map(([k, v]) => [k.toBase58(), v]));
      expect(entryMap.get(testKey1.toBase58())).toBe("value1");
      expect(entryMap.get(testKey2.toBase58())).toBe("value2");
      expect(entryMap.get(testKey3.toBase58())).toBe("value3");
    });
  });

  describe("Inheritance from Map", () => {
    it("should inherit Map.prototype.size", () => {
      const map = new PkMap<string>();
      expect(map.size).toBe(0);

      map.set(testKey1, "value1");
      expect(map.size).toBe(1);

      map.set(testKey2, "value2");
      expect(map.size).toBe(2);
    });

    it("should inherit Map.prototype.values()", () => {
      const map = new PkMap<string>();
      map.set(testKey1, "value1");
      map.set(testKey2, "value2");

      const values = Array.from(map.values());
      expect(values).toHaveLength(2);
      expect(values).toContain("value1");
      expect(values).toContain("value2");
    });

    it("should iterate over values with for...of", () => {
      const map = new PkMap<number>();
      map.set(testKey1, 10);
      map.set(testKey2, 20);
      map.set(testKey3, 30);

      const values: number[] = [];
      for (const value of map.values()) {
        values.push(value);
      }

      expect(values).toHaveLength(3);
      expect(values.sort()).toEqual([10, 20, 30]);
    });
  });

  describe("Edge cases", () => {
    it("should handle the default PublicKey", () => {
      const map = new PkMap<string>();
      const defaultKey = PublicKey.default;
      map.set(defaultKey, "default value");

      expect(map.get(defaultKey)).toBe("default value");
      expect(map.has(defaultKey)).toBe(true);
    });

    it("should handle large number of entries", () => {
      const map = new PkMap<number>();
      const keys: PublicKey[] = [];

      // Create 100 random keys
      for (let i = 0; i < 100; i++) {
        const key = new PublicKey(
          Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)),
        );
        keys.push(key);
        map.set(key, i);
      }

      expect(map.size).toBe(100);

      // Verify all keys can be retrieved
      keys.forEach((key, i) => {
        expect(map.get(key)).toBe(i);
      });
    });
  });
});
