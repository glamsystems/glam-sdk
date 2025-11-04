import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";

const FractionDecimal = Decimal.clone({ precision: 40 });

export interface BigFractionBytes {
  value: BN[];
  padding: BN[];
}

/**
 * Replicates the Fraction class from the klend-sdk:
 * https://github.com/Kamino-Finance/klend-sdk/blob/2fbc31a5b165aca3e2ca2e3d0e6162848743192d/src/classes/fraction.ts#L26
 */
export class Fraction {
  static MAX_SIZE_F = 128;
  static MAX_SIZE_BF = 256;
  static FRACTIONS = 60;
  static MULTIPLIER = new FractionDecimal(2).pow(Fraction.FRACTIONS);

  static MAX_F_BN = new BN(2).pow(new BN(Fraction.MAX_SIZE_F)).sub(new BN(1));
  static MAX_BF_BN = new BN(2).pow(new BN(Fraction.MAX_SIZE_BF)).sub(new BN(1));
  static MIN_BN = new BN(0);

  valueSf: BN;

  constructor(valueSf: BN) {
    if (valueSf.lt(Fraction.MIN_BN) || valueSf.gt(Fraction.MAX_BF_BN)) {
      throw new Error("Number out of range");
    }

    this.valueSf = valueSf;
  }

  toDecimal(): Decimal {
    return new FractionDecimal(this.valueSf.toString()).div(
      Fraction.MULTIPLIER,
    );
  }

  getValue(): BN {
    return this.valueSf;
  }

  gt(x: Fraction): boolean {
    return this.valueSf.gt(x.getValue());
  }

  lt(x: Fraction): boolean {
    return this.valueSf.lt(x.getValue());
  }

  gte(x: Fraction): boolean {
    return this.valueSf.gte(x.getValue());
  }

  lte(x: Fraction): boolean {
    return this.valueSf.lte(x.getValue());
  }

  eq(x: Fraction): boolean {
    return this.valueSf.eq(x.getValue());
  }
}

export function bfToDecimal(x: BigFractionBytes): Decimal {
  const bsf = x.value;
  const accSf = bsf.reduce(
    (acc, curr, i) => acc.add(curr.shln(i * 64)),
    new BN(0),
  );
  return new Fraction(accSf).toDecimal();
}
