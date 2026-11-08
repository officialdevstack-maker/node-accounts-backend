import { isDeepStrictEqual } from 'node:util';

export const toCamel = (value: string): string =>
  value.replace(/_+([a-z0-9])/gi, (_match, char: string) => char.toUpperCase());

export function snapshot<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

export function same(a: unknown, b: unknown): boolean {
  return isDeepStrictEqual(a, b);
}
