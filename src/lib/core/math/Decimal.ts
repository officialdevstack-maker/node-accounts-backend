// math/Decimal.ts
// Exact decimal arithmetic on BigInt, so 0.1 + 0.2 is 0.3 and money never drifts.
// Immutable: every method returns a new Decimal.
export type RoundingMode = 'half-up' | 'half-even' | 'down' | 'up' | 'floor' | 'ceil';
export type DecimalInput = Decimal | string | number | bigint;

const MAX_SCALE = 1000;
const pow10 = (n: number): bigint => 10n ** BigInt(n);

function checkScale(scale: number): number {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new RangeError(`Scale must be a whole number between 0 and ${MAX_SCALE}.`);
  }
  return scale;
}

/** n / d as an integer, rounded with `mode`. */
function divRound(n: bigint, d: bigint, mode: RoundingMode): bigint {
  if (d === 0n) throw new Error('Division by zero.');

  const q = n / d; // truncates toward zero
  const r = n % d;
  if (r === 0n) return q;

  const negative = n < 0n !== d < 0n;
  const away = negative ? -1n : 1n;
  const twiceRemainder = (r < 0n ? -r : r) * 2n;
  const divisor = d < 0n ? -d : d;

  switch (mode) {
    case 'down':
      return q;
    case 'up':
      return q + away;
    case 'floor':
      return negative ? q - 1n : q;
    case 'ceil':
      return negative ? q : q + 1n;
    case 'half-up':
      return twiceRemainder >= divisor ? q + away : q;
    case 'half-even':
      if (twiceRemainder > divisor) return q + away;
      if (twiceRemainder < divisor) return q;
      return q % 2n === 0n ? q : q + away;
  }
}

function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('Cannot take the square root of a negative number.');
  if (n < 2n) return n;

  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

export class Decimal {
  /** value = units / 10^scale */
  private constructor(
    readonly units: bigint,
    readonly scale: number,
  ) {}

  // ---- creating --------------------------------------------------------------------------
  /** Decimal.parse('12.50') · Decimal.parse(0.1) · Decimal.parse('1,000.5') · Decimal.parse('1e-7') */
  static parse(input: DecimalInput): Decimal {
    if (input instanceof Decimal) return input;
    if (typeof input === 'bigint') return new Decimal(input, 0);
    if (typeof input === 'number' && !Number.isFinite(input)) throw new TypeError(`Cannot use ${input} as a decimal.`);

    const text = String(input).trim().replace(/[_,]/g, '');
    const match = text.match(/^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
    if (!match) throw new TypeError(`"${text}" is not a valid number.`);

    const fraction = match[3] ?? match[4] ?? '';
    let units = BigInt(`${match[2] ?? ''}${fraction}`);
    let scale = fraction.length - Number(match[5] ?? 0);

    if (scale < 0) {
      if (-scale > MAX_SCALE) throw new RangeError(`"${text}" is too large.`);
      units *= pow10(-scale);
      scale = 0;
    }
    return new Decimal(match[1] === '-' ? -units : units, checkScale(scale));
  }

  static sum(values: readonly DecimalInput[]): Decimal {
    return values.reduce<Decimal>((total, value) => total.add(value), new Decimal(0n, 0));
  }

  static max(...values: DecimalInput[]): Decimal {
    return values.map((v) => Decimal.parse(v)).reduce((a, b) => (b.gt(a) ? b : a));
  }

  static min(...values: DecimalInput[]): Decimal {
    return values.map((v) => Decimal.parse(v)).reduce((a, b) => (b.lt(a) ? b : a));
  }

  private static align(a: Decimal, b: Decimal): [bigint, bigint, number] {
    const scale = Math.max(a.scale, b.scale);
    return [a.units * pow10(scale - a.scale), b.units * pow10(scale - b.scale), scale];
  }

  // ---- arithmetic ------------------------------------------------------------------------
  add(other: DecimalInput): Decimal {
    const [a, b, scale] = Decimal.align(this, Decimal.parse(other));
    return new Decimal(a + b, scale);
  }

  sub(other: DecimalInput): Decimal {
    const [a, b, scale] = Decimal.align(this, Decimal.parse(other));
    return new Decimal(a - b, scale);
  }

  mul(other: DecimalInput): Decimal {
    const o = Decimal.parse(other);
    return new Decimal(this.units * o.units, this.scale + o.scale);
  }

  /** Division is the only inexact operation, so you choose the decimal places kept (default 20). */
  div(other: DecimalInput, scale = 20, mode: RoundingMode = 'half-up'): Decimal {
    checkScale(scale);
    const o = Decimal.parse(other);
    if (o.units === 0n) throw new Error('Division by zero.');

    const numerator = this.units * pow10(o.scale + scale);
    const denominator = o.units * pow10(this.scale);
    return new Decimal(divRound(numerator, denominator, mode), scale);
  }

  /** Remainder, with the sign of the dividend (like JavaScript's %). */
  mod(other: DecimalInput): Decimal {
    const [a, b, scale] = Decimal.align(this, Decimal.parse(other));
    if (b === 0n) throw new Error('Division by zero.');
    return new Decimal(a % b, scale);
  }

  /** Whole-number exponents only. Negative exponents are rounded to 20 places. */
  pow(exponent: number): Decimal {
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 1000) {
      throw new RangeError('pow() needs a whole-number exponent between -1000 and 1000.');
    }

    let result = new Decimal(1n, 0);
    let base: Decimal = this;
    for (let n = Math.abs(exponent); n > 0; n = Math.floor(n / 2)) {
      if (n % 2 === 1) result = result.mul(base);
      if (n > 1) base = base.mul(base);
    }
    return exponent < 0 ? new Decimal(1n, 0).div(result, 20) : result;
  }

  sqrt(scale = 20): Decimal {
    checkScale(scale);
    if (this.isNegative()) throw new Error('Cannot take the square root of a negative number.');
    return new Decimal(isqrt(this.rescale(scale * 2, 'down').units), scale);
  }

  abs(): Decimal {
    return this.units < 0n ? new Decimal(-this.units, this.scale) : this;
  }

  neg(): Decimal {
    return new Decimal(-this.units, this.scale);
  }

  /** 15% of this: Decimal.parse(2000).percent(7.5) -> 150 (exact) */
  percent(percent: DecimalInput): Decimal {
    const p = Decimal.parse(percent);
    return this.mul(p).div(100, this.scale + p.scale + 2);
  }

  // ---- rounding --------------------------------------------------------------------------
  /** Same value with exactly `scale` decimal places (rounds when it has to cut digits). */
  rescale(scale: number, mode: RoundingMode = 'half-up'): Decimal {
    checkScale(scale);
    if (scale === this.scale) return this;
    if (scale > this.scale) return new Decimal(this.units * pow10(scale - this.scale), scale);
    return new Decimal(divRound(this.units, pow10(this.scale - scale), mode), scale);
  }

  round(scale = 0, mode: RoundingMode = 'half-up'): Decimal {
    return this.rescale(scale, mode);
  }

  floor(scale = 0): Decimal {
    return this.rescale(scale, 'floor');
  }

  ceil(scale = 0): Decimal {
    return this.rescale(scale, 'ceil');
  }

  /** Drop trailing zeros: 12.500 -> 12.5 */
  normalize(): Decimal {
    let { units, scale } = this;
    while (scale > 0 && units % 10n === 0n) {
      units /= 10n;
      scale--;
    }
    return scale === this.scale ? this : new Decimal(units, scale);
  }

  /**
   * Split an amount by ratios without losing a kobo: Decimal.parse(100).allocate([1, 1, 1]) -> 33.34, 33.33, 33.33.
   * The leftover smallest units go to the first parts.
   */
  allocate(ratios: readonly DecimalInput[], scale = 2): Decimal[] {
    if (!ratios.length) throw new Error('allocate() needs at least one ratio.');

    const amount = this.rescale(scale);
    if (amount.units < 0n) throw new Error('allocate() does not support negative amounts.');

    const parsed = ratios.map((r) => Decimal.parse(r));
    if (parsed.some((r) => r.units < 0n)) throw new Error('allocate() does not support negative ratios.');

    const common = Math.max(...parsed.map((r) => r.scale));
    const weights = parsed.map((r) => r.rescale(common).units);
    const total = weights.reduce((sum, w) => sum + w, 0n);
    if (total === 0n) throw new Error('allocate(): the ratios add up to zero.');

    const shares = weights.map((w) => (amount.units * w) / total);
    let left = amount.units - shares.reduce((sum, s) => sum + s, 0n);

    for (let i = 0; left > 0n; i = (i + 1) % shares.length) {
      if (weights[i] === 0n) continue;
      shares[i] = shares[i]! + 1n;
      left--;
    }
    return shares.map((s) => new Decimal(s, scale));
  }

  // ---- comparing -------------------------------------------------------------------------
  cmp(other: DecimalInput): -1 | 0 | 1 {
    const [a, b] = Decimal.align(this, Decimal.parse(other));
    return a < b ? -1 : a > b ? 1 : 0;
  }

  eq(other: DecimalInput): boolean {
    return this.cmp(other) === 0;
  }
  gt(other: DecimalInput): boolean {
    return this.cmp(other) === 1;
  }
  gte(other: DecimalInput): boolean {
    return this.cmp(other) >= 0;
  }
  lt(other: DecimalInput): boolean {
    return this.cmp(other) === -1;
  }
  lte(other: DecimalInput): boolean {
    return this.cmp(other) <= 0;
  }

  isZero(): boolean {
    return this.units === 0n;
  }
  isNegative(): boolean {
    return this.units < 0n;
  }
  isPositive(): boolean {
    return this.units > 0n;
  }

  // ---- output ----------------------------------------------------------------------------
  toString(): string {
    const negative = this.units < 0n;
    const digits = (negative ? -this.units : this.units).toString().padStart(this.scale + 1, '0');
    const whole = digits.slice(0, digits.length - this.scale);
    const fraction = digits.slice(digits.length - this.scale);
    return `${negative ? '-' : ''}${whole}${this.scale ? `.${fraction}` : ''}`;
  }

  /** Always `scale` decimal places: Decimal.parse('2.5').toFixed(2) -> '2.50' */
  toFixed(scale = 2, mode: RoundingMode = 'half-up'): string {
    return this.rescale(scale, mode).toString();
  }

  toNumber(): number {
    return Number(this.toString());
  }

  toJSON(): string {
    return this.toString();
  }

  /** 1234567.5 -> '1,234,567.50'. Pass a symbol for money: format(2, '₦') -> '₦1,234,567.50' */
  format(scale = 2, symbol = ''): string {
    const rounded = this.rescale(scale);
    const [whole = '0', fraction] = rounded.abs().toString().split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${rounded.isNegative() ? '-' : ''}${symbol}${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
  }
}

/** dec('12.50') */
export const dec = (value: DecimalInput): Decimal => Decimal.parse(value);
