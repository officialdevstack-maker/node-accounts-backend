// database/support.ts

/** 'user' -> 'users', 'category' -> 'categories', 'address' -> 'addresses', 'user_profile' -> 'user_profiles' */
export function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

/** 'UserProfile' | 'user-profile' | 'user profile' -> 'user_profile' */
export const toSnake = (input: string): string =>
  input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

/** 2026_11_07_103045  (sorts correctly as text, so migrations run in creation order) */
export function migrationTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`,
  ].join('_');
}
