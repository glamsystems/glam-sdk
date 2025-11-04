import { BN } from "@coral-xyz/anchor";

/**
 * Compares two sets for equality
 */
export const setsAreEqual = (a: Set<any>, b: Set<any>) => {
  if (a.size !== b.size) return false;
  for (let item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};

/**
 * Converts a buffer or array of character codes to a string
 */
export function charsToName(chars: number[] | Buffer): string {
  return String.fromCharCode(...chars)
    .replace(/\0/g, "")
    .trim();
}

/**
 * Converts a string to an array of character codes (max 32 bytes)
 */
export function nameToChars(name: string): number[] {
  return Array.from(Buffer.from(name).subarray(0, 32));
}

export function toUiAmount(amount: BN, decimals: number): number {
  return amount.toNumber() / 10 ** decimals;
}
