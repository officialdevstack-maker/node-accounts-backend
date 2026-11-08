import HttpError from '../../error.js';
import type { Connection } from '../query/Connection.js';
import { DB, type Column, type Paginated, type QueryBuilder, type Row } from '../query/index.js';
import type { Model, ModelConstructor } from './Model.js';
import { castSet } from './casts.js';

export type GlobalScope = (query: QueryBuilder, model: ModelConstructor<Model>) => void;
export type LocalScope = (query: QueryBuilder, ...args: any[]) => void;
export type EagerConstraint = (query: ModelQuery<any>) => unknown;
export type EagerSpec = string | Record<string, EagerConstraint>;
type EagerGroup = { constraint?: EagerConstraint | undefined; nested: EagerSpec[] };

const FORWARDED = [
  'whereColumn', 'orWhereColumn', 'whereNotIn', 'orWhereIn', 'orWhereNotIn', 'orWhereNull', 'orWhereNotNull',
  'whereBetween', 'whereNotBetween', 'orWhereBetween', 'whereExists', 'whereNotExists', 'orWhereExists',
  'whereRaw', 'orWhereRaw', 'whereDate', 'whereDay', 'whereMonth', 'whereYear', 'whereTime',
  'orWhereDate', 'orWhereMonth', 'orWhereYear', 'select', 'addSelect', 'selectRaw', 'distinct',
  'join', 'leftJoin', 'rightJoin', 'groupBy', 'groupByRaw', 'having', 'orHaving', 'havingRaw',
  'orderByRaw', 'inRandomOrder', 'reorder', 'take', 'skip', 'forPage', 'sharedLock',
] as const;

type ForwardedMethods<T extends Model> = {
  [K in (typeof FORWARDED)[number]]: (...args: Parameters<QueryBuilder[K]>) => ModelQuery<T>;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface ModelQuery<T extends Model> extends ForwardedMethods<T> {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ModelQuery<T extends Model> {
  private builder: QueryBuilder;
  private includeHidden = false;
  private allScopesRemoved = false;
  private readonly removedScopes = new Set<string>();
  private readonly eager = new Map<string, EagerConstraint | undefined>();

  constructor(private readonly ctor: ModelConstructor<T>) {
    this.builder = DB.table(ctor.tableName());
  }

  where(...args: Parameters<QueryBuilder['where']>): this { this.builder.where(...args); return this; }
  orWhere(...args: Parameters<QueryBuilder['orWhere']>): this { this.builder.orWhere(...args); return this; }
  whereIn(column: Column, values: unknown[] | QueryBuilder): this { this.builder.whereIn(column, values); return this; }
  whereNull(column: Column): this { this.builder.whereNull(column); return this; }
  whereNotNull(column: Column): this { this.builder.whereNotNull(column); return this; }
  orderBy(column: Column, direction: 'asc' | 'desc' = 'asc'): this { this.builder.orderBy(column, direction); return this; }
  orderByDesc(column: Column): this { this.builder.orderByDesc(column); return this; }
  latest(column?: Column): this { this.builder.latest(column); return this; }
  oldest(column?: Column): this { this.builder.oldest(column); return this; }
  limit(count: number): this { this.builder.limit(count); return this; }
  offset(count: number): this { this.builder.offset(count); return this; }
  tap(callback: (query: QueryBuilder) => unknown): this { callback(this.builder); return this; }

  withHidden(): this { this.includeHidden = true; return this; }
  lockForUpdate(): this { this.builder.lockForUpdate(); return this; }
  using(connection: Connection): this {
    this.builder = connection.table(this.ctor.tableName());
    return this;
  }

  scope(name: string, ...args: unknown[]): this {
    const scope = this.ctor.scopes[name];
    if (!scope) throw new Error(`Scope "${name}" is not defined on ${this.ctor.name}.`);
    scope(this.builder, ...args);
    return this;
  }

  withoutGlobalScope(...names: string[]): this {
    names.forEach((name) => this.removedScopes.add(name));
    return this;
  }

  withoutGlobalScopes(): this {
    this.allScopesRemoved = true;
    return this;
  }

  withTrashed(): this { return this.withoutGlobalScope('softDeletes'); }
  onlyTrashed(): this {
    if (!this.ctor.softDeletes) return this;
    this.withoutGlobalScope('softDeletes');
    this.builder.whereNotNull(this.ctor.deletedAt);
    return this;
  }

  with(...relations: Array<EagerSpec | EagerSpec[]>): this {
    for (const item of relations.flat()) {
      if (typeof item === 'string') {
        if (!this.eager.has(item)) this.eager.set(item, undefined);
      } else {
        for (const [name, constraint] of Object.entries(item)) this.eager.set(name, constraint);
      }
    }
    return this;
  }

  async loadRelationsFor(models: T[]): Promise<void> {
    const first = models[0];
    if (!first || !this.eager.size) return;

    const groups = new Map<string, EagerGroup>();
    for (const [path, constraint] of this.eager) {
      const [head = '', ...rest] = path.split('.');
      const group: EagerGroup = groups.get(head) ?? { nested: [] };
      if (!rest.length) group.constraint = constraint;
      else group.nested.push(constraint ? { [rest.join('.')]: constraint } : rest.join('.'));
      groups.set(head, group);
    }

    for (const [name, group] of groups) {
      await first.relation(name).eagerLoad(models, name, group.constraint, group.nested);
    }
  }

  increment(attribute: string, amount = 1, extra: Record<string, unknown> = {}): Promise<number> {
    return this.scoped().increment(this.ctor.columnFor(attribute), amount, this.withTimestamp(this.toRow(extra)));
  }

  decrement(attribute: string, amount = 1, extra: Record<string, unknown> = {}): Promise<number> {
    return this.scoped().decrement(this.ctor.columnFor(attribute), amount, this.withTimestamp(this.toRow(extra)));
  }

  async get(): Promise<T[]> {
    const models = (await this.scoped().get()).map((row) => this.hydrate(row));
    await this.loadRelationsFor(models);
    return models;
  }

  async first(): Promise<T | null> {
    const row = await this.scoped().first();
    if (!row) return null;
    const model = this.hydrate(row);
    await this.loadRelationsFor([model]);
    return model;
  }

  find(id: string | number): Promise<T | null> {
    return this.where(this.ctor.primaryKey, id).first();
  }

  async firstOrFail(): Promise<T> {
    const model = await this.first();
    if (!model) throw HttpError.notFound(`${this.ctor.name} not found.`);
    return model;
  }

  async findOrFail(id: string | number): Promise<T> {
    const model = await this.find(id);
    if (!model) throw HttpError.notFound(`${this.ctor.name} not found.`);
    return model;
  }

  async firstOrNew(attributes: Record<string, unknown>, values: Record<string, unknown> = {}): Promise<T> {
    const found = await this.matching(attributes).first();
    if (found) return found;

    const model = new this.ctor();
    model.fill({ ...attributes, ...values });
    return model;
  }

  async firstOrCreate(attributes: Record<string, unknown>, values: Record<string, unknown> = {}): Promise<T> {
    const model = await this.firstOrNew(attributes, values);
    if (!model.$exists) await model.save();
    return model;
  }

  async updateOrCreate(attributes: Record<string, unknown>, values: Record<string, unknown> = {}): Promise<T> {
    const found = await this.matching(attributes).first();
    if (found) {
      await found.update(values);
      return found;
    }

    const model = new this.ctor();
    model.fill({ ...attributes, ...values });
    await model.save();
    return model;
  }

  count(): Promise<number> { return this.scoped().count(); }
  exists(): Promise<boolean> { return this.scoped().exists(); }
  doesntExist(): Promise<boolean> { return this.scoped().doesntExist(); }
  sum(column: Column): Promise<number> { return this.scoped().sum(column); }
  avg(column: Column): Promise<number | null> { return this.scoped().avg(column); }
  min(column: Column): Promise<unknown> { return this.scoped().min(column); }
  max(column: Column): Promise<unknown> { return this.scoped().max(column); }
  pluck(column: string): Promise<unknown[]> { return this.scoped().pluck(column); }
  value(column: string): Promise<unknown> { return this.scoped().value(column); }
  toSql(): string { return this.scoped().toSql(); }

  async paginate(perPage = 15, page = 1): Promise<Paginated<T>> {
    const result = await this.scoped().paginate(perPage, page);
    const data = result.data.map((row) => this.hydrate(row));
    await this.loadRelationsFor(data);
    return { ...result, data };
  }

  private matching(attributes: Record<string, unknown>): this {
    for (const [key, value] of Object.entries(attributes)) this.builder.where(this.ctor.columnFor(key), value);
    return this;
  }

  private activeScopes(): GlobalScope[] {
    if (this.allScopesRemoved) return [];
    return Object.entries(this.ctor.globalScopes())
      .filter(([name]) => !this.removedScopes.has(name))
      .map(([, scope]) => scope);
  }

  private scoped(): QueryBuilder {
    const scopes = this.activeScopes();
    if (!scopes.length) return this.builder;

    const query = this.builder.clone();
    const inner = query.wheres.splice(0);
    if (inner.length) query.where((group) => { group.wheres.push(...inner); });
    for (const scope of scopes) scope(query, this.ctor as unknown as ModelConstructor<Model>);
    return query;
  }

  private hydrate(row: Row): T {
    const model = new this.ctor();
    model.$hydrate(row, this.includeHidden);
    return model;
  }

  private withTimestamp(row: Row): Row {
    const { timestamps, updatedAt } = this.ctor;
    return timestamps && !(updatedAt in row) ? { ...row, [updatedAt]: new Date() } : row;
  }

  private toRow(attributes: Record<string, unknown>): Row {
    const row: Row = {};
    for (const [attribute, value] of Object.entries(attributes)) {
      row[this.ctor.columnFor(attribute)] = castSet(this.ctor.casts[attribute], value);
    }
    return row;
  }
}

for (const name of FORWARDED) {
  Object.defineProperty(ModelQuery.prototype, name, {
    value(this: ModelQuery<Model>, ...args: unknown[]) {
      const { builder } = this as unknown as { builder: Record<string, (...args: unknown[]) => unknown> };
      builder[name]!(...args);
      return this;
    },
    writable: true,
    configurable: true,
  });
}
