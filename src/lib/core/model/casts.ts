export type CastName = 'int' | 'integer' | 'float' | 'boolean' | 'string' | 'json' | 'date' | 'decimal' | `decimal:${number}`;

export interface CustomCast {
  get(value: unknown): unknown;
  set(value: unknown): unknown;
}

export type Cast = CastName | CustomCast;

function decimalString(value: unknown): string {
  const stringValue = typeof value === 'string' ? value : String(value);
  if (!/^[+-]?\d+(?:\.\d*)?$/.test(stringValue)) {
    throw new Error(`Invalid decimal value "${stringValue}".`);
  }
  return stringValue;
}

function formatDecimal(value: unknown, places: number): string {
  if (!Number.isInteger(places) || places < 0) throw new Error(`Invalid decimal precision "${places}".`);

  const input = decimalString(value);
  const sign = input.startsWith('-') ? '-' : '';
  const unsigned = input.replace(/^[+-]/, '');
  const [whole = '0', fraction = ''] = unsigned.split('.');
  let retained = (fraction.slice(0, places) + '0'.repeat(places)).slice(0, places);
  const roundUp = (fraction[places] ?? '0') >= '5';

  if (roundUp) {
    const digits = `${whole}${retained}`.split('');
    let index = digits.length - 1;
    while (index >= 0 && digits[index] === '9') {
      digits[index] = '0';
      index--;
    }
    if (index >= 0) digits[index] = '0123456789'['0123456789'.indexOf(digits[index]!) + 1]!;
    else digits.unshift('1');
    const rounded = digits.join('');
    const wholeLength = rounded.length - places;
    return `${sign}${rounded.slice(0, wholeLength)}${places ? `.${rounded.slice(wholeLength)}` : ''}`;
  }

  return `${sign}${whole}${places ? `.${retained}` : ''}`;
}

export function castGet(cast: Cast | undefined, value: unknown): unknown {
  if (cast === undefined || value === null || value === undefined) return value;
  if (typeof cast === 'object') return cast.get(value);

  switch (cast) {
    case 'int':
    case 'integer': return Math.trunc(Number(value));
    case 'float': return Number(value);
    case 'boolean': return value === true || value === 1 || value === '1' || value === 'true';
    case 'string': return String(value);
    case 'json': return typeof value === 'string' ? JSON.parse(value) : value;
    case 'date': return value instanceof Date ? value : new Date(value as string | number);
    case 'decimal': return decimalString(value);
    default: {
      const precision = /^decimal:(\d+)$/.exec(cast);
      if (precision) return formatDecimal(value, Number(precision[1]));
      throw new Error(`Unknown cast "${cast}".`);
    }
  }
}

export function castSet(cast: Cast | undefined, value: unknown): unknown {
  if (cast === undefined || value === null || value === undefined) return value;
  if (typeof cast === 'object') return cast.set(value);

  switch (cast) {
    case 'boolean': return value ? 1 : 0;
    case 'json': return typeof value === 'string' ? value : JSON.stringify(value);
    case 'date': return value instanceof Date ? value : new Date(value as string | number);
    case 'decimal': return decimalString(value);
    default: {
      const precision = /^decimal:(\d+)$/.exec(cast);
      return precision ? formatDecimal(value, Number(precision[1])) : value;
    }
  }
}
