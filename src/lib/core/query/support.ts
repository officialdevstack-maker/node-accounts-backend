export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** undefined -> null, bigint -> string, arrays / objects -> JSON (an array would otherwise be expanded into "a, b, c"). */
export function normalizeBinding(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value) || isPlainObject(value)) return JSON.stringify(value);
  return value;
}

/** The key a column has in the result row: 'users.name' -> 'name', 'name as n' -> 'n' */
export function outputKey(column: string): string {
  const alias = column.match(/\s+as\s+(.+)$/i);
  const name = (alias ? alias[1]! : column).trim();
  return name.split('.').pop() ?? name;
}

function display(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Fills the ? placeholders for DISPLAY only (logs, dump). Never execute the result. */
export function interpolate(sql: string, bindings: readonly unknown[]): string {
  let index = 0;
  return sql.replace(/\?/g, (match) => (index < bindings.length ? display(bindings[index++]) : match));
}
