// math/Num.ts
// The facade for everyday number work: Num.round(1.005, 2), Num.percentage(30, 120), Num.median([...]).
// Everything goes through Decimal, so results are not hit by floating point errors.
import { Decimal, type DecimalInput, type RoundingMode } from './Decimal.js';

function needs(values: readonly unknown[], name: string): void {
  if (!values.length) throw new Error(`Num.${name}() needs at least one number.`);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export const Num = {
  clamp(value: number, min: number, max: number): number {
    if (min > max) throw new RangeError('clamp(): min cannot be greater than max.');
    return Math.min(Math.max(value, min), max);
  },

  between(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  },

  /** Num.round(1.005, 2) -> 1.01 (plain Math.round gives 1) */
  round(value: DecimalInput, precision = 0, mode: RoundingMode = 'half-up'): number {
    return Decimal.parse(value).round(precision, mode).toNumber();
  },

  floor(value: DecimalInput, precision = 0): number {
    return Decimal.parse(value).floor(precision).toNumber();
  },

  ceil(value: DecimalInput, precision = 0): number {
    return Decimal.parse(value).ceil(precision).toNumber();
  },

  /** Num.percentage(30, 120) -> 25 (0 when `whole` is 0) */
  percentage(part: DecimalInput, whole: DecimalInput, precision = 2): number {
    if (Decimal.parse(whole).isZero()) return 0;
    return Decimal.parse(part).mul(100).div(whole, precision).toNumber();
  },

  /** Num.percentOf(7.5, 2000) -> 150 */
  percentOf(percent: DecimalInput, value: DecimalInput, precision = 2): number {
    return Decimal.parse(value).percent(percent).round(precision).toNumber();
  },

  /** Num.percentChange(80, 100) -> 25. Null when `from` is 0. */
  percentChange(from: DecimalInput, to: DecimalInput, precision = 2): number | null {
    const start = Decimal.parse(from);
    if (start.isZero()) return null;
    return Decimal.parse(to).sub(start).mul(100).div(start, precision).toNumber();
  },

  lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  },

  // ---- lists -----------------------------------------------------------------------------
  sum(values: readonly DecimalInput[]): number {
    return Decimal.sum(values).toNumber();
  },

  avg(values: readonly DecimalInput[], precision = 10): number {
    needs(values, 'avg');
    return Decimal.sum(values).div(values.length, precision).toNumber();
  },

  median(values: readonly DecimalInput[]): number {
    needs(values, 'median');
    const sorted = values.map((v) => Decimal.parse(v)).sort((a, b) => a.cmp(b));
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2) return sorted[middle]!.toNumber();
    return sorted[middle - 1]!.add(sorted[middle]!).div(2, 12).toNumber();
  },

  /** Most frequent value(s). */
  mode(values: readonly number[]): number[] {
    needs(values, 'mode');
    const counts = new Map<number, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

    const top = Math.max(...counts.values());
    return [...counts].filter(([, count]) => count === top).map(([value]) => value);
  },

  min(values: readonly number[]): number {
    needs(values, 'min');
    return Math.min(...values);
  },

  max(values: readonly number[]): number {
    needs(values, 'max');
    return Math.max(...values);
  },

  /** Population variance, or sample variance (n - 1) with sample = true. */
  variance(values: readonly DecimalInput[], sample = false): number {
    needs(values, 'variance');
    if (sample && values.length < 2) throw new Error('Num.variance(): a sample needs at least two numbers.');

    const mean = Decimal.sum(values).div(values.length, 20);
    const squares = values.map((v) => {
      const delta = Decimal.parse(v).sub(mean);
      return delta.mul(delta);
    });
    return Decimal.sum(squares).div(sample ? values.length - 1 : values.length, 12).toNumber();
  },

  stdDev(values: readonly DecimalInput[], sample = false): number {
    return Math.sqrt(Num.variance(values, sample));
  },

  /** Num.range(0, 1, 0.25) -> [0, 0.25, 0.5, 0.75, 1] (inclusive, no float drift) */
  range(start: DecimalInput, end: DecimalInput, step: DecimalInput = 1): number[] {
    const increment = Decimal.parse(step);
    if (increment.isZero()) throw new RangeError('range(): step cannot be 0.');

    const last = Decimal.parse(end);
    const result: number[] = [];
    for (let current = Decimal.parse(start); increment.isPositive() ? current.lte(last) : current.gte(last); current = current.add(increment)) {
      result.push(current.toNumber());
      if (result.length > 100_000) throw new RangeError('range(): too many values.');
    }
    return result;
  },

  // ---- integers --------------------------------------------------------------------------
  gcd(a: number, b: number): number {
    if (!Number.isInteger(a) || !Number.isInteger(b)) throw new TypeError('gcd() needs whole numbers.');
    return gcd(a, b);
  },

  lcm(a: number, b: number): number {
    if (!Number.isInteger(a) || !Number.isInteger(b)) throw new TypeError('lcm() needs whole numbers.');
    return a === 0 || b === 0 ? 0 : Math.abs(a / gcd(a, b) * b);
  },

  isPrime(n: number): boolean {
    if (!Number.isInteger(n) || n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  },

  /** Returns a bigint so big results stay exact: Num.factorial(25) */
  factorial(n: number): bigint {
    if (!Number.isInteger(n) || n < 0 || n > 1000) throw new RangeError('factorial() needs a whole number between 0 and 1000.');
    let result = 1n;
    for (let i = 2n; i <= BigInt(n); i++) result *= i;
    return result;
  },
};
