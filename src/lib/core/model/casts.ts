export type CastName = 'int' | 'float' | 'boolean' | 'string' | 'json' | 'date';

export interface CustomCast {
  get(value: unknown): unknown;
  set(value: unknown): unknown;
}

export type Cast = CastName | CustomCast;

export function castGet(cast: Cast | undefined, value: unknown): unknown {
  if (cast === undefined || value === null || value === undefined) return value;
  if (typeof cast === 'object') return cast.get(value);

  switch (cast) {
    case 'int': return Math.trunc(Number(value));
    case 'float': return Number(value);
    case 'boolean': return value === true || value === 1 || value === '1' || value === 'true';
    case 'string': return String(value);
    case 'json': return typeof value === 'string' ? JSON.parse(value) : value;
    case 'date': return value instanceof Date ? value : new Date(value as string | number);
  }
}

export function castSet(cast: Cast | undefined, value: unknown): unknown {
  if (cast === undefined || value === null || value === undefined) return value;
  if (typeof cast === 'object') return cast.set(value);

  switch (cast) {
    case 'boolean': return value ? 1 : 0;
    case 'json': return typeof value === 'string' ? value : JSON.stringify(value);
    case 'date': return value instanceof Date ? value : new Date(value as string | number);
    default: return value;
  }
}
