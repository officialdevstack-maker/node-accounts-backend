import { DB } from '../core/query/index.js';
import type { Rules } from '../core/validation/types.js';
import { parseJson } from '../oidc/util.js';

type SettingDefinition<T> = {
  default: T;
  rule: string;
  cast: (value: unknown) => T;
};

const toBoolean = (value: unknown): boolean => {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  throw new TypeError('Stored boolean setting has an invalid value.');
};

/** Add new settings here. Only keys listed here can be read or written. */
export const settingDefinitions = {
  registration_enabled: { default: true, rule: 'boolean', cast: toBoolean },
  maintenance_mode: { default: false, rule: 'boolean', cast: toBoolean },
  support_email: {
    default: '',
    rule: 'nullable|string|email|max:254',
    cast: (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : ''),
  },
} satisfies Record<string, SettingDefinition<unknown>>;

export type SettingKey = keyof typeof settingDefinitions;
export type AccountSettings = {
  registration_enabled: boolean;
  maintenance_mode: boolean;
  support_email: string;
};

const keys = Object.keys(settingDefinitions) as SettingKey[];

export function settingRules(): Rules {
  return Object.fromEntries(keys.map((key) => [key, `sometimes|${settingDefinitions[key].rule}`]));
}

export async function getSettings(): Promise<AccountSettings> {
  const rows = await DB.table('settings').get();
  const stored = new Map(rows.map((row) => [String(row.name), parseJson<unknown>(row.value)]));
  const value = (key: SettingKey) =>
    settingDefinitions[key].cast(stored.has(key) ? stored.get(key) : settingDefinitions[key].default);

  return {
    registration_enabled: value('registration_enabled') as boolean,
    maintenance_mode: value('maintenance_mode') as boolean,
    support_email: value('support_email') as string,
  };
}

export async function getSetting(key: SettingKey): Promise<boolean | string> {
  return (await getSettings())[key];
}

export async function updateSettings(changes: Partial<AccountSettings>): Promise<void> {
  const now = new Date();

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(changes, key)) continue;
    const value = settingDefinitions[key].cast(changes[key]);
    await DB.table('settings').upsert(
      { name: key, value, created_at: now, updated_at: now },
      ['name'],
      ['value', 'updated_at'],
    );
  }
}
