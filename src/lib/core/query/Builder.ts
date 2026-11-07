import type { Connection } from './Connection.js';
import { Raw } from './Raw.js';
import { interpolate, isPlainObject, outputKey } from './support.js';
import type {
  AggregateFn,
  AggregateSpec,
  Bool,
  Column,
  DatePart,
  Direction,
  HavingClause,
  JoinKind,
  LockMode,
  OrderClause,
  Paginated,
  Row,
  Source,
  UnionClause,
  WhereClause,
} from './types.js';

const OPERATORS = new Set(['=', '<', '>', '<=', '>=', '<>', '!=', 'like', 'not like', 'ilike', 'not ilike']);

function checkOperator(operator: string): string {
  const op = String(operator).trim().toLowerCase();
  if (!OPERATORS.has(op)) throw new Error(`Invalid operator "${operator}". Allowed: ${[...OPERATORS].join(', ')}.`);
  return op;
}

function defined<T>(value: T, label: string): T {
  if (value === undefined) throw new Error(`${label}: the value is undefined (a missing request field?). Pass null explicitly if you mean NULL.`);
  return value;
}

export type SubSource = QueryBuilder | ((query: QueryBuilder) => void);
type WhereArgs =
  | [callback: (query: WhereGroup) => void]
  | [conditions: Record<string, unknown>]
  | [column: Column, value: unknown]
  | [column: Column, operator: string, value: unknown];
type ColumnArgs = [first: Column, second: Column] | [first: Column, operator: string, second: Column];
type DateArgs = [value: unknown] | [operator: string, value: unknown];
type JoinArgs = [callback: (join: JoinClause) => void] | ColumnArgs;

export abstract class Conditions {
  readonly wheres: WhereClause[] = [];

  constructor(protected readonly connection: Connection) {}

  when<V>(value: V, then: (query: this, value: V) => unknown, otherwise?: (query: this, value: V) => unknown): this {
    if (value) then(this, value);
    else otherwise?.(this, value);
    return this;
  }

  unless<V>(value: V, then: (query: this, value: V) => unknown): this {
    if (!value) then(this, value);
    return this;
  }

  where(...args: WhereArgs): this {
    return this.addWhere('and', args);
  }
  orWhere(...args: WhereArgs): this {
    return this.addWhere('or', args);
  }

  whereColumn(...args: ColumnArgs): this {
    return this.addColumn('and', args);
  }
  orWhereColumn(...args: ColumnArgs): this {
    return this.addColumn('or', args);
  }

  whereIn(column: Column, values: unknown[] | SubSource): this {
    return this.addIn('and', column, values, false);
  }
  whereNotIn(column: Column, values: unknown[] | SubSource): this {
    return this.addIn('and', column, values, true);
  }
  orWhereIn(column: Column, values: unknown[] | SubSource): this {
    return this.addIn('or', column, values, false);
  }
  orWhereNotIn(column: Column, values: unknown[] | SubSource): this {
    return this.addIn('or', column, values, true);
  }

  whereNull(column: Column): this {
    return this.addNull('and', column, false);
  }
  whereNotNull(column: Column): this {
    return this.addNull('and', column, true);
  }
  orWhereNull(column: Column): this {
    return this.addNull('or', column, false);
  }
  orWhereNotNull(column: Column): this {
    return this.addNull('or', column, true);
  }

  whereBetween(column: Column, values: readonly [unknown, unknown]): this {
    return this.addBetween('and', column, values, false);
  }
  whereNotBetween(column: Column, values: readonly [unknown, unknown]): this {
    return this.addBetween('and', column, values, true);
  }
  orWhereBetween(column: Column, values: readonly [unknown, unknown]): this {
    return this.addBetween('or', column, values, false);
  }

  whereExists(query: SubSource): this {
    this.wheres.push({ type: 'exists', query: this.subquery(query), not: false, boolean: 'and' });
    return this;
  }
  whereNotExists(query: SubSource): this {
    this.wheres.push({ type: 'exists', query: this.subquery(query), not: true, boolean: 'and' });
    return this;
  }
  orWhereExists(query: SubSource): this {
    this.wheres.push({ type: 'exists', query: this.subquery(query), not: false, boolean: 'or' });
    return this;
  }

  whereRaw(sql: string, bindings: readonly unknown[] = []): this {
    this.wheres.push({ type: 'raw', sql, bindings, boolean: 'and' });
    return this;
  }
  orWhereRaw(sql: string, bindings: readonly unknown[] = []): this {
    this.wheres.push({ type: 'raw', sql, bindings, boolean: 'or' });
    return this;
  }

  whereDate(column: Column, ...args: DateArgs): this {
    return this.addDate('date', 'and', column, args);
  }
  whereDay(column: Column, ...args: DateArgs): this {
    return this.addDate('day', 'and', column, args);
  }
  whereMonth(column: Column, ...args: DateArgs): this {
    return this.addDate('month', 'and', column, args);
  }
  whereYear(column: Column, ...args: DateArgs): this {
    return this.addDate('year', 'and', column, args);
  }
  whereTime(column: Column, ...args: DateArgs): this {
    return this.addDate('time', 'and', column, args);
  }
  orWhereDate(column: Column, ...args: DateArgs): this {
    return this.addDate('date', 'or', column, args);
  }
  orWhereMonth(column: Column, ...args: DateArgs): this {
    return this.addDate('month', 'or', column, args);
  }
  orWhereYear(column: Column, ...args: DateArgs): this {
    return this.addDate('year', 'or', column, args);
  }

  protected subquery(source: SubSource): QueryBuilder {
    if (source instanceof QueryBuilder) return source;
    const query = new QueryBuilder(this.connection);
    source(query);
    return query;
  }

  protected nest(boolean: Bool, build: (group: WhereGroup) => void): this {
    const group = new WhereGroup(this.connection);
    build(group);
    if (group.wheres.length) this.wheres.push({ type: 'nested', query: group, boolean });
    return this;
  }

  protected addWhere(boolean: Bool, args: readonly unknown[]): this {
    const [column, second, third] = args;

    if (typeof column === 'function') return this.nest(boolean, column as (group: WhereGroup) => void);

    if (args.length === 1) {
      if (!isPlainObject(column)) throw new Error('where() needs a column, a callback or an object of column => value.');
      return this.nest(boolean, (group) => {
        for (const [key, value] of Object.entries(column)) group.where(key, value);
      });
    }

    if (typeof column !== 'string' && !(column instanceof Raw)) throw new Error('where(): the column must be a string or DB.raw().');

    const operator = args.length === 2 ? '=' : checkOperator(String(second));
    const value = args.length === 2 ? second : third;
    defined(value, `where("${String(column)}")`);

    if (typeof value === 'function' || value instanceof QueryBuilder) {
      this.wheres.push({ type: 'sub', column, operator, query: this.subquery(value as SubSource), boolean });
      return this;
    }

    if (value === null) {
      if (operator === '=') return this.addNull(boolean, column, false);
      if (operator === '<>' || operator === '!=') return this.addNull(boolean, column, true);
    }

    this.wheres.push({ type: 'basic', column, operator, value, boolean });
    return this;
  }

  protected addColumn(boolean: Bool, args: readonly unknown[]): this {
    const [first, a, b] = args;
    const operator = args.length === 2 ? '=' : checkOperator(String(a));
    const second = args.length === 2 ? a : b;
    this.wheres.push({ type: 'column', first: first as Column, operator, second: second as Column, boolean });
    return this;
  }

  protected addIn(boolean: Bool, column: Column, values: unknown[] | SubSource, not: boolean): this {
    if (Array.isArray(values)) {
      values.forEach((v, i) => defined(v, `whereIn("${String(column)}")[${i}]`));
      this.wheres.push({ type: 'in', column, values, not, boolean });
    } else {
      this.wheres.push({ type: 'in', column, values: this.subquery(values as SubSource), not, boolean });
    }
    return this;
  }

  protected addNull(boolean: Bool, column: Column, not: boolean): this {
    this.wheres.push({ type: 'null', column, not, boolean });
    return this;
  }

  protected addBetween(boolean: Bool, column: Column, values: readonly [unknown, unknown], not: boolean): this {
    this.wheres.push({
      type: 'between',
      column,
      values: [defined(values[0], 'whereBetween()'), defined(values[1], 'whereBetween()')],
      not,
      boolean,
    });
    return this;
  }

  protected addDate(part: DatePart, boolean: Bool, column: Column, args: DateArgs): this {
    const operator = args.length === 1 ? '=' : checkOperator(args[0] as string);
    const value = args.length === 1 ? args[0] : args[1];
    this.wheres.push({ type: 'date', part, column, operator, value: defined(value, `where${part}()`), boolean });
    return this;
  }
}

export class WhereGroup extends Conditions {}

export class JoinClause extends Conditions {
  constructor(
    connection: Connection,
    readonly kind: JoinKind,
    readonly source: Source,
  ) {
    super(connection);
  }

  on(...args: ColumnArgs): this {
    return this.addColumn('and', args);
  }
  orOn(...args: ColumnArgs): this {
    return this.addColumn('or', args);
  }
}

export class QueryBuilder extends Conditions {
  columns: Column[] = [];
  isDistinct = false;
  fromSource: Source | undefined = undefined;
  joins: JoinClause[] = [];
  groups: Column[] = [];
  havings: HavingClause[] = [];
  orders: OrderClause[] = [];
  limitValue: number | undefined = undefined;
  offsetValue: number | undefined = undefined;
  unions: UnionClause[] = [];
  lockMode: LockMode | undefined = undefined;
  aggregateSpec: AggregateSpec | undefined = undefined;

  private get grammar() {
    return this.connection.grammar;
  }

  from(table: string | Raw): this {
    this.fromSource = table;
    return this;
  }

  fromSub(query: SubSource, alias: string): this {
    this.fromSource = { query: this.subquery(query), alias };
    return this;
  }

  select(...columns: Column[]): this {
    this.columns = columns;
    return this;
  }

  addSelect(...columns: Column[]): this {
    this.columns.push(...columns);
    return this;
  }

  selectRaw(sql: string, bindings: readonly unknown[] = []): this {
    this.columns.push(new Raw(sql, bindings));
    return this;
  }

  selectSub(query: SubSource, alias: string): this {
    const { sql, bindings } = this.grammar.compileSelect(this.subquery(query));
    this.columns.push(new Raw(`(${sql}) as ${this.grammar.wrap(alias)}`, bindings));
    return this;
  }

  distinct(): this {
    this.isDistinct = true;
    return this;
  }

  join(table: string | Raw, ...args: JoinArgs): this {
    return this.addJoin('inner', table, args);
  }
  leftJoin(table: string | Raw, ...args: JoinArgs): this {
    return this.addJoin('left', table, args);
  }
  rightJoin(table: string | Raw, ...args: JoinArgs): this {
    return this.addJoin('right', table, args);
  }
  crossJoin(table: string | Raw): this {
    this.joins.push(new JoinClause(this.connection, 'cross', table));
    return this;
  }
  joinSub(query: SubSource, alias: string, ...args: JoinArgs): this {
    return this.addJoin('inner', { query: this.subquery(query), alias }, args);
  }
  leftJoinSub(query: SubSource, alias: string, ...args: JoinArgs): this {
    return this.addJoin('left', { query: this.subquery(query), alias }, args);
  }

  private addJoin(kind: JoinKind, source: Source, args: JoinArgs): this {
    const join = new JoinClause(this.connection, kind, source);
    if (typeof args[0] === 'function') (args[0] as (join: JoinClause) => void)(join);
    else join.on(...(args as ColumnArgs));
    this.joins.push(join);
    return this;
  }

  groupBy(...columns: Column[]): this {
    this.groups.push(...columns);
    return this;
  }

  groupByRaw(sql: string, bindings: readonly unknown[] = []): this {
    this.groups.push(new Raw(sql, bindings));
    return this;
  }

  having(column: Column, operator: string, value: unknown): this {
    this.havings.push({ type: 'basic', column, operator: checkOperator(operator), value: defined(value, 'having()'), boolean: 'and' });
    return this;
  }

  orHaving(column: Column, operator: string, value: unknown): this {
    this.havings.push({ type: 'basic', column, operator: checkOperator(operator), value: defined(value, 'orHaving()'), boolean: 'or' });
    return this;
  }

  havingRaw(sql: string, bindings: readonly unknown[] = []): this {
    this.havings.push({ type: 'raw', sql, bindings, boolean: 'and' });
    return this;
  }

  orderBy(column: Column, direction: Direction | (string & {}) = 'asc'): this {
    const dir = String(direction).toLowerCase();
    if (dir !== 'asc' && dir !== 'desc') throw new Error(`orderBy(): direction must be "asc" or "desc", got "${direction}".`);
    this.orders.push({ type: 'column', column, direction: dir });
    return this;
  }

  orderByDesc(column: Column): this {
    return this.orderBy(column, 'desc');
  }

  latest(column: Column = 'created_at'): this {
    return this.orderBy(column, 'desc');
  }

  oldest(column: Column = 'created_at'): this {
    return this.orderBy(column, 'asc');
  }

  orderByRaw(sql: string, bindings: readonly unknown[] = []): this {
    this.orders.push({ type: 'raw', sql, bindings });
    return this;
  }

  inRandomOrder(): this {
    this.orders.push({ type: 'random' });
    return this;
  }

  reorder(column?: Column, direction: Direction = 'asc'): this {
    this.orders = [];
    return column === undefined ? this : this.orderBy(column, direction);
  }

  limit(count: number): this {
    if (!Number.isInteger(count) || count < 0) throw new Error('limit() must be a whole number of 0 or more.');
    this.limitValue = count;
    return this;
  }
  take(count: number): this {
    return this.limit(count);
  }

  offset(count: number): this {
    if (!Number.isInteger(count) || count < 0) throw new Error('offset() must be a whole number of 0 or more.');
    this.offsetValue = count;
    return this;
  }
  skip(count: number): this {
    return this.offset(count);
  }

  forPage(page: number, perPage = 15): this {
    if (!Number.isInteger(page) || page < 1) throw new Error('page must be a whole number of 1 or more.');
    if (!Number.isInteger(perPage) || perPage < 1) throw new Error('perPage must be a whole number of 1 or more.');
    return this.offset((page - 1) * perPage).limit(perPage);
  }

  union(query: SubSource): this {
    this.unions.push({ query: this.subquery(query), all: false });
    return this;
  }
  unionAll(query: SubSource): this {
    this.unions.push({ query: this.subquery(query), all: true });
    return this;
  }

  lockForUpdate(): this {
    this.lockMode = 'update';
    return this;
  }
  sharedLock(): this {
    this.lockMode = 'shared';
    return this;
  }

  clone(): QueryBuilder {
    const copy = new QueryBuilder(this.connection);
    copy.wheres.push(...this.wheres);
    copy.columns = [...this.columns];
    copy.isDistinct = this.isDistinct;
    copy.fromSource = this.fromSource;
    copy.joins = [...this.joins];
    copy.groups = [...this.groups];
    copy.havings = [...this.havings];
    copy.orders = [...this.orders];
    copy.limitValue = this.limitValue;
    copy.offsetValue = this.offsetValue;
    copy.unions = [...this.unions];
    copy.lockMode = this.lockMode;
    copy.aggregateSpec = this.aggregateSpec;
    return copy;
  }

  toSql(): string {
    return this.grammar.compileSelect(this).sql;
  }

  getBindings(): unknown[] {
    return this.grammar.compileSelect(this).bindings;
  }

  toRawSql(): string {
    const { sql, bindings } = this.grammar.compileSelect(this);
    return interpolate(sql, bindings);
  }

  dump(): this {
    console.log(this.toRawSql());
    return this;
  }

  async get(columns?: string[]): Promise<Row[]> {
    const query = columns && !this.columns.length ? this.clone().select(...columns) : this;
    const { sql, bindings } = this.grammar.compileSelect(query);
    return this.connection.select(sql, bindings);
  }

  async first(columns?: string[]): Promise<Row | null> {
    return (await this.clone().limit(1).get(columns))[0] ?? null;
  }

  async find(id: string | number, column = 'id'): Promise<Row | null> {
    return this.clone().where(column, id).first();
  }

  async value(column: string): Promise<unknown> {
    const row = await this.clone().select(column).first();
    return row ? row[outputKey(column)] : null;
  }

  pluck(column: string): Promise<unknown[]>;
  pluck(column: string, key: string): Promise<Record<string, unknown>>;
  async pluck(column: string, key?: string): Promise<unknown[] | Record<string, unknown>> {
    const rows = await this.clone().select(...(key ? [column, key] : [column])).get();
    const valueKey = outputKey(column);

    if (!key) return rows.map((row) => row[valueKey]);
    const keyName = outputKey(key);
    return Object.fromEntries(rows.map((row) => [String(row[keyName]), row[valueKey]]));
  }

  async exists(): Promise<boolean> {
    const { sql, bindings } = this.grammar.compileExists(this);
    const [row] = await this.connection.select(sql, bindings);
    return Boolean(Number(row?.exists ?? 0));
  }

  async doesntExist(): Promise<boolean> {
    return !(await this.exists());
  }

  async count(column: Column = '*'): Promise<number> {
    return Number(await this.aggregate('count', column));
  }

  async sum(column: Column): Promise<number> {
    return Number((await this.aggregate('sum', column)) ?? 0);
  }

  async avg(column: Column): Promise<number | null> {
    const value = await this.aggregate('avg', column);
    return value === null || value === undefined ? null : Number(value);
  }

  async min(column: Column): Promise<unknown> {
    return this.aggregate('min', column);
  }

  async max(column: Column): Promise<unknown> {
    return this.aggregate('max', column);
  }

  private async aggregate(fn: AggregateFn, column: Column): Promise<unknown> {
    let query: QueryBuilder;

    if (this.groups.length || this.havings.length || this.unions.length) {
      query = new QueryBuilder(this.connection).fromSub(this.clone(), 'aggregate_table');
    } else {
      query = this.clone();
      query.columns = [];
      query.orders = [];
      query.limitValue = undefined;
      query.offsetValue = undefined;
    }

    query.aggregateSpec = { fn, column };
    const { sql, bindings } = this.grammar.compileSelect(query);
    const [row] = await this.connection.select(sql, bindings);
    return row?.aggregate ?? null;
  }

  async paginate(perPage = 15, page = 1): Promise<Paginated<Row>> {
    if (!Number.isInteger(perPage) || perPage < 1) throw new Error('perPage must be a whole number of 1 or more.');
    if (!Number.isInteger(page) || page < 1) throw new Error('page must be a whole number of 1 or more.');

    const total = await this.count();
    const data = total ? await this.clone().forPage(page, perPage).get() : [];
    const from = data.length ? (page - 1) * perPage + 1 : null;

    return {
      data,
      total,
      perPage,
      currentPage: page,
      lastPage: Math.max(1, Math.ceil(total / perPage)),
      from,
      to: from === null ? null : from + data.length - 1,
    };
  }

  async chunk(size: number, callback: (rows: Row[], page: number) => unknown): Promise<boolean> {
    if (!this.orders.length) throw new Error('chunk() needs an orderBy() so pages are stable (or use chunkById()).');

    for (let page = 1; ; page++) {
      const rows = await this.clone().forPage(page, size).get();
      if (!rows.length) return true;
      if ((await callback(rows, page)) === false) return false;
      if (rows.length < size) return true;
    }
  }

  async chunkById(size: number, callback: (rows: Row[], page: number) => unknown, column = 'id'): Promise<boolean> {
    const key = outputKey(column);
    let last: unknown;

    for (let page = 1; ; page++) {
      const query = this.clone().reorder(column).limit(size);
      if (last !== undefined) query.where(column, '>', last);

      const rows = await query.get();
      if (!rows.length) return true;
      if ((await callback(rows, page)) === false) return false;

      last = rows[rows.length - 1]![key];
      if (last === undefined) throw new Error(`chunkById(): column "${key}" is not in the result.`);
      if (rows.length < size) return true;
    }
  }

  private requireTable(): string {
    if (typeof this.fromSource !== 'string') throw new Error('This operation needs a plain table: DB.table("users").');
    return this.fromSource;
  }

  private rows(values: Row | Row[]): Row[] {
    const rows = Array.isArray(values) ? values : [values];
    const first = rows[0];
    if (!first) return [];

    const signature = (row: Row) => Object.keys(row).sort().join('\u0000');
    const expected = signature(first);

    rows.forEach((row, index) => {
      if (!isPlainObject(row)) throw new Error(`insert(): row ${index} must be a plain object.`);
      if (signature(row) !== expected) throw new Error(`insert(): row ${index} has different columns than the first row.`);
    });
    return rows;
  }

  async insert(values: Row | Row[]): Promise<boolean> {
    const rows = this.rows(values);
    if (!rows.length) return true;

    const { sql, bindings } = this.grammar.insert(this.requireTable(), rows);
    await this.connection.execute(sql, bindings);
    return true;
  }

  async insertOrIgnore(values: Row | Row[]): Promise<number> {
    const rows = this.rows(values);
    if (!rows.length) return 0;

    const { sql, bindings } = this.grammar.insert(this.requireTable(), rows, { ignore: true });
    return (await this.connection.execute(sql, bindings)).affectedRows;
  }

  async insertGetId(values: Row, idColumn = 'id'): Promise<number | string> {
    const [row] = this.rows(values);
    const { sql, bindings } = this.grammar.insert(this.requireTable(), row ? [row] : [{}], { returning: idColumn });
    const result = await this.connection.execute(sql, bindings);

    const id = result.rows[0]?.[idColumn] ?? result.insertId;
    if (id === undefined || id === null) throw new Error('insertGetId(): the database did not return an id.');
    return id as number | string;
  }

  async update(values: Row): Promise<number> {
    if (!Object.keys(values).length) return 0;
    const { sql, bindings } = this.grammar.update(this, values);
    return (await this.connection.execute(sql, bindings)).affectedRows;
  }

  async updateOrInsert(attributes: Row, values: Row = {}): Promise<boolean> {
    const query = this.clone().where(attributes);

    if (!(await query.exists())) {
      await this.insert({ ...attributes, ...values });
      return true;
    }
    if (Object.keys(values).length) await query.update(values);
    return true;
  }

  async upsert(values: Row | Row[], uniqueBy: string[], update?: string[]): Promise<number> {
    const rows = this.rows(values);
    if (!rows.length) return 0;
    if (!uniqueBy.length) throw new Error('upsert(): uniqueBy needs at least one column.');

    const columns = Object.keys(rows[0]!);
    const updateColumns = update ?? columns.filter((column) => !uniqueBy.includes(column));
    if (!updateColumns.length) return this.insertOrIgnore(rows);

    const { sql, bindings } = this.grammar.upsert(this.requireTable(), rows, uniqueBy, updateColumns);
    return (await this.connection.execute(sql, bindings)).affectedRows;
  }

  increment(column: string, amount = 1, extra: Row = {}): Promise<number> {
    return this.step(column, amount, '+', extra);
  }

  decrement(column: string, amount = 1, extra: Row = {}): Promise<number> {
    return this.step(column, amount, '-', extra);
  }

  private step(column: string, amount: number, sign: '+' | '-', extra: Row): Promise<number> {
    if (!Number.isFinite(amount)) throw new Error('increment() / decrement(): the amount must be a number.');
    const expression = new Raw(`${this.grammar.wrap(column)} ${sign} ?`, [amount]);
    return this.update({ [column]: expression, ...extra });
  }

  async delete(id?: string | number): Promise<number> {
    const query = id === undefined ? this : this.clone().where('id', id);
    const { sql, bindings } = this.grammar.delete(query);
    return (await this.connection.execute(sql, bindings)).affectedRows;
  }

  async truncate(): Promise<void> {
    for (const { sql, bindings } of this.grammar.truncate(this.requireTable())) {
      await this.connection.execute(sql, bindings);
    }
  }
}
