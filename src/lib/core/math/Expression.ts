// math/Expression.ts
// A small, safe calculator (no eval): evaluate('(1200 * 1.075) / 3 + fee', { vars: { fee: 50 } })
// Operators: + - * / % ^ and parentheses. Functions: abs round floor ceil min max sum avg sqrt pow.
import { Decimal, type DecimalInput } from './Decimal.js';

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpressionError';
  }
}

export interface EvaluateOptions {
  /** Named values usable in the expression: { vat: 7.5 } */
  vars?: Record<string, DecimalInput>;
  /** Decimal places kept by division (default 20). Results have trailing zeros removed. */
  scale?: number;
}

interface Token {
  type: 'num' | 'id' | 'op' | '(' | ')' | ',';
  text: string;
  pos: number;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];

  for (let i = 0; i < source.length; ) {
    const char = source[i]!;
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    const rest = source.slice(i);
    const number = rest.match(/^(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    const id = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);

    if (number) {
      tokens.push({ type: 'num', text: number[0], pos: i });
      i += number[0].length;
    } else if (id) {
      tokens.push({ type: 'id', text: id[0], pos: i });
      i += id[0].length;
    } else if ('+-*/%^'.includes(char)) {
      tokens.push({ type: 'op', text: char, pos: i++ });
    } else if (char === '(' || char === ')' || char === ',') {
      tokens.push({ type: char, text: char, pos: i++ });
    } else {
      throw new ExpressionError(`Unexpected "${char}" at position ${i + 1}.`);
    }
  }
  return tokens;
}

function whole(value: Decimal, what: string): number {
  const n = Number(value.toString());
  if (!Number.isInteger(n)) throw new ExpressionError(`${what} must be a whole number.`);
  return n;
}

function expect(name: string, args: Decimal[], min: number, max = min): void {
  if (args.length < min || args.length > max) {
    throw new ExpressionError(`${name}() takes ${min === max ? min : `${min} to ${max}`} argument${max === 1 ? '' : 's'}, got ${args.length}.`);
  }
}

const FUNCTIONS: Record<string, (args: Decimal[]) => Decimal> = {
  abs: (a) => (expect('abs', a, 1), a[0]!.abs()),
  round: (a) => (expect('round', a, 1, 2), a[0]!.round(a[1] ? whole(a[1], 'round() places') : 0)),
  floor: (a) => (expect('floor', a, 1, 2), a[0]!.floor(a[1] ? whole(a[1], 'floor() places') : 0)),
  ceil: (a) => (expect('ceil', a, 1, 2), a[0]!.ceil(a[1] ? whole(a[1], 'ceil() places') : 0)),
  sqrt: (a) => (expect('sqrt', a, 1), a[0]!.sqrt()),
  pow: (a) => (expect('pow', a, 2), a[0]!.pow(whole(a[1]!, 'pow() exponent'))),
  min: (a) => (expect('min', a, 1, Infinity), Decimal.min(...a)),
  max: (a) => (expect('max', a, 1, Infinity), Decimal.max(...a)),
  sum: (a) => (expect('sum', a, 1, Infinity), Decimal.sum(a)),
  avg: (a) => (expect('avg', a, 1, Infinity), Decimal.sum(a).div(a.length, 20)),
};

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly vars: Map<string, Decimal>,
    private readonly scale: number,
  ) {}

  run(): Decimal {
    const value = this.expression();
    const extra = this.tokens[this.pos];
    if (extra) throw new ExpressionError(`Unexpected "${extra.text}" at position ${extra.pos + 1}.`);
    return value.normalize();
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private isOp(...ops: string[]): boolean {
    const token = this.peek();
    return token?.type === 'op' && ops.includes(token.text);
  }

  private take(type: Token['type']): Token {
    const token = this.tokens[this.pos++];
    if (!token) throw new ExpressionError('Unexpected end of expression.');
    if (token.type !== type) throw new ExpressionError(`Expected "${type}" but found "${token.text}" at position ${token.pos + 1}.`);
    return token;
  }

  private expression(): Decimal {
    let left = this.term();
    while (this.isOp('+', '-')) {
      const op = this.tokens[this.pos++]!.text;
      const right = this.term();
      left = op === '+' ? left.add(right) : left.sub(right);
    }
    return left;
  }

  private term(): Decimal {
    let left = this.unary();
    while (this.isOp('*', '/', '%')) {
      const op = this.tokens[this.pos++]!.text;
      const right = this.unary();
      left = op === '*' ? left.mul(right) : op === '/' ? left.div(right, this.scale).normalize() : left.mod(right);
    }
    return left;
  }

  private unary(): Decimal {
    if (this.isOp('-')) {
      this.pos++;
      return this.unary().neg();
    }
    if (this.isOp('+')) {
      this.pos++;
      return this.unary();
    }
    return this.power();
  }

  /** Right associative: 2 ^ 3 ^ 2 = 2 ^ 9 */
  private power(): Decimal {
    const base = this.primary();
    if (!this.isOp('^')) return base;

    this.pos++;
    return base.pow(whole(this.unary(), 'The exponent'));
  }

  private primary(): Decimal {
    const token = this.tokens[this.pos++];
    if (!token) throw new ExpressionError('Unexpected end of expression.');

    if (token.type === 'num') return Decimal.parse(token.text);

    if (token.type === '(') {
      const value = this.expression();
      this.take(')');
      return value;
    }

    if (token.type === 'id') {
      if (this.peek()?.type === '(') return this.call(token);

      const value = this.vars.get(token.text);
      if (!value) throw new ExpressionError(`Unknown variable "${token.text}".`);
      return value;
    }

    throw new ExpressionError(`Unexpected "${token.text}" at position ${token.pos + 1}.`);
  }

  private call(name: Token): Decimal {
    const fn = Object.prototype.hasOwnProperty.call(FUNCTIONS, name.text.toLowerCase()) ? FUNCTIONS[name.text.toLowerCase()] : undefined;
    if (!fn) throw new ExpressionError(`Unknown function "${name.text}()".`);

    this.take('(');
    const args: Decimal[] = [];
    if (this.peek()?.type === ')') {
      this.pos++;
    } else {
      for (;;) {
        args.push(this.expression());
        if (this.peek()?.type === ',') {
          this.pos++;
          continue;
        }
        this.take(')');
        break;
      }
    }
    return fn(args);
  }
}

export function evaluate(expression: string, options: EvaluateOptions = {}): Decimal {
  const vars = new Map(Object.entries(options.vars ?? {}).map(([key, value]) => [key, Decimal.parse(value)]));

  try {
    return new Parser(tokenize(expression), vars, options.scale ?? 20).run();
  } catch (error) {
    if (error instanceof ExpressionError) throw error;
    throw new ExpressionError(error instanceof Error ? error.message : String(error));
  }
}
