// validation/rules.ts
import { isIP } from "net";
import { QueryTypes } from "sequelize";
// import db from "../config/database.js";
import { getByPath, hasPath, isBlank } from "./helpers.js";
import type { Data, RuleSpec } from "./types.js";
import db from "../../database.js";

const str = (v: unknown) => String(v);

// ---------- helpers ----------
const isNumeric = (v: any) =>
  (typeof v === "number" && Number.isFinite(v)) ||
  (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));

const isInteger = (v: any) =>
  typeof v === "number" ? Number.isInteger(v) : typeof v === "string" && /^[+-]?\d+$/.test(v.trim());

const inList = (v: any, list: string[]) =>
  Array.isArray(v) ? v.every((x) => list.includes(str(x))) : list.includes(str(v));

function toRegExp(pattern: string): RegExp {
  const m = pattern.match(/^\/([\s\S]*)\/([a-z]*)$/);
  if (!m) throw new Error(`Invalid regex rule "${pattern}". Use regex:/pattern/flags`);
  return new RegExp(m[1] as string, (m[2] as string).replace(/[gy]/g, "")); // g/y make .test() stateful
}

function parseDate(v: any): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function resolveDate(param: string, data: Data): Date | null {
  if (param === "now") return new Date();
  if (param === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (hasPath(data, param)) return parseDate(getByPath(data, param)); // after:start_date
  return parseDate(param);
}

const dateRule =
  (op: (a: number, b: number) => boolean): RuleSpec["passes"] =>
  ({ value, params, data }) => {
    const a = parseDate(value);
    const b = resolveDate(String(params[0]) ?? "", data);
    return !!a && !!b && op(a.getTime(), b.getTime());
  };

// ---------- database helpers (unique / exists) ----------
const IDENT = /^[A-Za-z0-9_]+$/;
const ident = (name: string) => {
  if (!IDENT.test(name)) throw new Error(`Invalid SQL identifier "${name}" in validation rule.`);
  return `\`${name}\``;
};
const isNull = (v?: string) => v === undefined || v === "" || v.toUpperCase() === "NULL";

async function countRows(
  table: string,
  column: string,
  value: unknown,
  ignore?: { id: string; column: string }
): Promise<number> {
  let sql = `SELECT COUNT(*) AS total FROM ${ident(table)} WHERE ${ident(column)} = :value`;
  const replacements: Record<string, unknown> = {
    value: typeof value === "number" ? value : str(value),
  };

  if (ignore) {
    sql += ` AND ${ident(ignore.column)} <> :ignore`;
    replacements.ignore = ignore.id;
  }

  const rows = await db.query<{ total: number | string }>(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
  return Number(rows[0]?.total ?? 0);
}

const lastSegment = (attribute: string) => attribute.split(".").pop() as string;

// ---------- registry ----------
export const ruleRegistry: Record<string, RuleSpec> = {
  // markers handled by the engine
  bail: { passes: () => true },
  nullable: { passes: () => true },
  sometimes: { passes: () => true },

  // presence
  required: { implicit: true, passes: ({ value }) => !isBlank(value) },
  required_if: {
    implicit: true,
    passes: ({ value, params, data }) => {
      const [other, ...vals] = params;
      return vals.includes(str(getByPath(data, other as string))) ? !isBlank(value) : true;
    },
  },
  required_unless: {
    implicit: true,
    passes: ({ value, params, data }) => {
      const [other, ...vals] = params;
      return vals.includes(str(getByPath(data, String(other)))) ? true : !isBlank(value);
    },
  },
  required_with: {
    implicit: true,
    passes: ({ value, params, data }) =>
      params.some((p) => !isBlank(getByPath(data, p))) ? !isBlank(value) : true,
  },
  required_without: {
    implicit: true,
    passes: ({ value, params, data }) =>
      params.some((p) => isBlank(getByPath(data, p))) ? !isBlank(value) : true,
  },
  accepted: {
    implicit: true,
    passes: ({ value }) => ["yes", "on", "1", "true"].includes(str(value).toLowerCase()),
  },

  // types
  string: { passes: ({ value }) => typeof value === "string" },
  numeric: { passes: ({ value }) => isNumeric(value) },
  integer: { passes: ({ value }) => isInteger(value) },
  boolean: {
    passes: ({ value }) => [true, false, 1, 0, "1", "0", "true", "false"].includes(value),
  },
  array: { passes: ({ value }) => Array.isArray(value) },

  // formats
  email: {
    passes: ({ value }) =>
      typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  },
  url: {
    passes: ({ value }) => {
      try {
        const u = new URL(str(value));
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
  },
  ip: { passes: ({ value }) => isIP(str(value)) !== 0 },
  uuid: {
    passes: ({ value }) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str(value)),
  },
  json: {
    passes: ({ value }) => {
      if (typeof value !== "string") return false;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
  },
  alpha: { passes: ({ value }) => typeof value === "string" && /^\p{L}+$/u.test(value) },
  alpha_num: { passes: ({ value }) => typeof value === "string" && /^[\p{L}\p{N}]+$/u.test(value) },
  alpha_dash: {
    passes: ({ value }) => typeof value === "string" && /^[\p{L}\p{N}_-]+$/u.test(value),
  },
  lowercase: { passes: ({ value }) => str(value) === str(value).toLowerCase() },
  uppercase: { passes: ({ value }) => str(value) === str(value).toUpperCase() },

  // size
  min: { passes: ({ attribute, value, params, validator }) => validator.getSize(attribute, value) >= Number(String(params[0])) },
  max: { passes: ({ attribute, value, params, validator }) => validator.getSize(attribute, value) <= Number(String(params[0])) },
  between: {
    passes: ({ attribute, value, params, validator }) => {
      const size = validator.getSize(attribute, value);
      return size >= Number(String(params[0])) && size <= Number(params[1]);
    },
  },
  size: { passes: ({ attribute, value, params, validator }) => validator.getSize(attribute, value) === Number(String(params[0])) },
  digits: {
    passes: ({ value, params }) => /^\d+$/.test(str(value)) && str(value).length === Number(String(params[0])),
  },
  digits_between: {
    passes: ({ value, params }) =>
      /^\d+$/.test(str(value)) && str(value).length >= Number(String(params[0])) && str(value).length <= Number(params[1]),
  },

  // lists & patterns
  in: { passes: ({ value, params }) => inList(value, params) },
  not_in: { passes: ({ value, params }) => !inList(value, params) },
  regex: { passes: ({ value, params }) => toRegExp(String(params[0])).test(str(value)) },
  not_regex: { passes: ({ value, params }) => !toRegExp(String(params[0])).test(str(value)) },
  starts_with: { passes: ({ value, params }) => params.some((p) => str(value).startsWith(p)) },
  ends_with: { passes: ({ value, params }) => params.some((p) => str(value).endsWith(p)) },

  // comparison
  confirmed: {
    passes: ({ attribute, value, data }) => value === getByPath(data, `${attribute}_confirmation`),
  },
  same: { passes: ({ value, params, data }) => value === getByPath(data, String(params[0])) },
  different: { passes: ({ value, params, data }) => value !== getByPath(data, String(params[0])) },

  // dates
  date: { passes: ({ value }) => parseDate(value) !== null },
  after: { passes: dateRule((a, b) => a > b) },
  after_or_equal: { passes: dateRule((a, b) => a >= b) },
  before: { passes: dateRule((a, b) => a < b) },
  before_or_equal: { passes: dateRule((a, b) => a <= b) },

  // database: unique:table,column,ignoreId,idColumn   exists:table,column
  unique: {
    passes: async ({ attribute, value, params }) => {
      const [table, col, ignoreId, idColumn] = params;
      const column = isNull(col) ? lastSegment(attribute) : col;
      const ignore = isNull(ignoreId) ? undefined : { id: ignoreId, column: idColumn || "id" };
      return (await countRows(table as string, column as string, value, ignore as any)) === 0;
    },
  },
  exists: {
    passes: async ({ attribute, value, params }) => {
      const [table, col] = params;
      const column = isNull(col) ? lastSegment(attribute) : col;
      return (await countRows(table as string, column as string, value)) > 0;
    },
  },
};