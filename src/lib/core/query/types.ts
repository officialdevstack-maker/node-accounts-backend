import type { Conditions, QueryBuilder } from './Builder.js';
import type { Raw } from './Raw.js';

export type Row = Record<string, any>;
/** A column name ('users.id', 'name as n') or DB.raw('count(*)') */
export type Column = string | Raw;
export type Bool = 'and' | 'or';
export type Direction = 'asc' | 'desc';
export type DatePart = 'date' | 'day' | 'month' | 'year' | 'time';
export type LockMode = 'update' | 'shared';
export type JoinKind = 'inner' | 'left' | 'right' | 'cross';
export type AggregateFn = 'count' | 'sum' | 'avg' | 'min' | 'max';

/** from (select ...) as alias */
export interface FromSub {
  query: QueryBuilder;
  alias: string;
}
export type Source = string | Raw | FromSub;

export type WhereClause =
  | { type: 'basic'; column: Column; operator: string; value: unknown; boolean: Bool }
  | { type: 'column'; first: Column; operator: string; second: Column; boolean: Bool }
  | { type: 'sub'; column: Column; operator: string; query: QueryBuilder; boolean: Bool }
  | { type: 'in'; column: Column; values: unknown[] | QueryBuilder; not: boolean; boolean: Bool }
  | { type: 'null'; column: Column; not: boolean; boolean: Bool }
  | { type: 'between'; column: Column; values: [unknown, unknown]; not: boolean; boolean: Bool }
  | { type: 'nested'; query: Conditions; boolean: Bool }
  | { type: 'exists'; query: QueryBuilder; not: boolean; boolean: Bool }
  | { type: 'raw'; sql: string; bindings: readonly unknown[]; boolean: Bool }
  | { type: 'date'; part: DatePart; column: Column; operator: string; value: unknown; boolean: Bool };

export type HavingClause =
  | { type: 'basic'; column: Column; operator: string; value: unknown; boolean: Bool }
  | { type: 'raw'; sql: string; bindings: readonly unknown[]; boolean: Bool };

export type OrderClause =
  | { type: 'column'; column: Column; direction: Direction }
  | { type: 'raw'; sql: string; bindings: readonly unknown[] }
  | { type: 'random' };

export interface UnionClause {
  query: QueryBuilder;
  all: boolean;
}

export interface AggregateSpec {
  fn: AggregateFn;
  column: Column;
}

/** Bindings are collected in SQL order while compiling, so subqueries and raw pieces line up automatically. */
export interface CompileState {
  bindings: unknown[];
}

export interface Compiled {
  sql: string;
  bindings: unknown[];
}

export interface ExecResult {
  rows: Row[];
  affectedRows: number;
  insertId: number | string | undefined;
}

export interface QueryEvent {
  sql: string;
  bindings: unknown[];
  ms: number;
  dialect: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
}
