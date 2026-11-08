import HttpError from '../../error.js';
import { DB, type Column, type Paginated, type QueryBuilder, type Row } from '../query/index.js';
import type { Model, ModelConstructor } from './Model.js';

type Trashed = 'without' | 'with' | 'only';

export class ModelQuery<T extends Model> {
  private readonly builder: QueryBuilder;
  private trashed: Trashed = 'without';

  constructor(private readonly ctor: ModelConstructor<T>) {
    this.builder = DB.table(ctor.tableName());
  }

  where(...args: Parameters<QueryBuilder['where']>): this { this.builder.where(...args); return this; }
  orWhere(...args: Parameters<QueryBuilder['orWhere']>): this { this.builder.orWhere(...args); return this; }
  whereIn(column: Column, values: unknown[]): this { this.builder.whereIn(column, values); return this; }
  whereNull(column: Column): this { this.builder.whereNull(column); return this; }
  whereNotNull(column: Column): this { this.builder.whereNotNull(column); return this; }
  orderBy(column: Column, direction: 'asc' | 'desc' = 'asc'): this { this.builder.orderBy(column, direction); return this; }
  orderByDesc(column: Column): this { this.builder.orderByDesc(column); return this; }
  latest(column?: Column): this { this.builder.latest(column); return this; }
  oldest(column?: Column): this { this.builder.oldest(column); return this; }
  limit(count: number): this { this.builder.limit(count); return this; }
  offset(count: number): this { this.builder.offset(count); return this; }

  tap(callback: (query: QueryBuilder) => unknown): this { callback(this.builder); return this; }

  withTrashed(): this { this.trashed = 'with'; return this; }
  onlyTrashed(): this { this.trashed = 'only'; return this; }

  async get(): Promise<T[]> {
    return (await this.scoped().get()).map((row) => this.hydrate(row));
  }

  async first(): Promise<T | null> {
    const row = await this.scoped().first();
    return row ? this.hydrate(row) : null;
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

  count(): Promise<number> { return this.scoped().count(); }
  exists(): Promise<boolean> { return this.scoped().exists(); }

  async paginate(perPage = 15, page = 1): Promise<Paginated<T>> {
    const result = await this.scoped().paginate(perPage, page);
    return { ...result, data: result.data.map((row) => this.hydrate(row)) };
  }

  private scoped(): QueryBuilder {
    if (!this.ctor.softDeletes || this.trashed === 'with') return this.builder;

    const query = this.builder.clone();
    const inner = query.wheres.splice(0);
    if (inner.length) query.where((group) => { group.wheres.push(...inner); });

    if (this.trashed === 'only') query.whereNotNull(this.ctor.deletedAt);
    else query.whereNull(this.ctor.deletedAt);
    return query;
  }

  private hydrate(row: Row): T {
    const model = new this.ctor();
    model.$hydrate(row);
    return model;
  }
}
