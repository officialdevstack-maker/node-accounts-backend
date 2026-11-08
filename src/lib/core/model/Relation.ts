import type { Model, ModelConstructor } from './Model.js';
import { ModelQuery, type EagerConstraint, type EagerSpec } from './ModelQuery.js';

type Ctor = ModelConstructor<Model>;

const attr = (model: Model, column: string): string => (model.constructor as unknown as Ctor).attributeFor(column);
const read = (model: Model, column: string): unknown => model.$attributes[attr(model, column)];
const keyOf = (value: unknown): string => String(value);
const present = (value: unknown): boolean => value !== null && value !== undefined;
const unique = (values: unknown[]): unknown[] => [...new Set(values)];

export abstract class Relation<R extends Model> {
  constructor(
    protected readonly parent: Model,
    protected readonly related: ModelConstructor<R>,
    protected readonly foreignKey: string,
    protected readonly localKey: string,
  ) {}

  protected abstract constrain(query: ModelQuery<R>): void;
  protected abstract constrainEager(query: ModelQuery<R>, parents: Model[]): void;
  protected abstract match(parents: Model[], results: R[], name: string): void;
  abstract getResults(): Promise<R | R[] | null>;

  query(): ModelQuery<R> {
    const query = new ModelQuery(this.related);
    this.constrain(query);
    return query;
  }

  get(): Promise<R[]> {
    return this.query().get();
  }

  first(): Promise<R | null> {
    return this.query().first();
  }

  async eagerLoad(
    parents: Model[],
    name: string,
    constraint?: EagerConstraint,
    nested: EagerSpec[] = [],
  ): Promise<void> {
    const query = new ModelQuery(this.related);
    this.constrainEager(query, parents);
    if (nested.length) query.with(...nested);
    constraint?.(query);
    this.match(parents, await query.get(), name);
  }
}

abstract class HasOneOrMany<R extends Model> extends Relation<R> {
  protected abstract shape(list: R[]): R | R[] | null;

  protected constrain(query: ModelQuery<R>): void {
    const key = read(this.parent, this.localKey);
    if (!present(key)) query.whereRaw('0 = 1');
    else query.where(this.foreignKey, key);
  }

  protected constrainEager(query: ModelQuery<R>, parents: Model[]): void {
    query.whereIn(this.foreignKey, unique(parents.map((p) => read(p, this.localKey)).filter(present)) as unknown[]);
  }

  protected match(parents: Model[], results: R[], name: string): void {
    const buckets = new Map<string, R[]>();
    for (const result of results) {
      const key = keyOf(read(result, this.foreignKey));
      const bucket = buckets.get(key);
      if (bucket) bucket.push(result);
      else buckets.set(key, [result]);
    }
    for (const parent of parents) {
      parent.setRelation(name, this.shape(buckets.get(keyOf(read(parent, this.localKey))) ?? []));
    }
  }

  async create(attributes: Record<string, unknown>): Promise<R> {
    const model = new this.related();
    model.fill(attributes);
    model.forceFill({ [this.related.attributeFor(this.foreignKey)]: read(this.parent, this.localKey) });
    await model.save();
    return model;
  }
}

export class HasMany<R extends Model> extends HasOneOrMany<R> {
  protected shape(list: R[]): R[] {
    return list;
  }

  getResults(): Promise<R[]> {
    return this.get();
  }
}

export class HasOne<R extends Model> extends HasOneOrMany<R> {
  protected shape(list: R[]): R | null {
    return list[0] ?? null;
  }

  getResults(): Promise<R | null> {
    return this.first();
  }
}

export class BelongsTo<R extends Model> extends Relation<R> {
  protected constrain(query: ModelQuery<R>): void {
    const key = read(this.parent, this.foreignKey);
    if (!present(key)) query.whereRaw('0 = 1');
    else query.where(this.localKey, key);
  }

  protected constrainEager(query: ModelQuery<R>, parents: Model[]): void {
    query.whereIn(this.localKey, unique(parents.map((p) => read(p, this.foreignKey)).filter(present)) as unknown[]);
  }

  protected match(parents: Model[], results: R[], name: string): void {
    const byKey = new Map(results.map((r) => [keyOf(read(r, this.localKey)), r] as const));
    for (const parent of parents) {
      const fk = read(parent, this.foreignKey);
      parent.setRelation(name, present(fk) ? (byKey.get(keyOf(fk)) ?? null) : null);
    }
  }

  getResults(): Promise<R | null> {
    return this.first();
  }

  associate(owner: R): Model {
    Reflect.set(this.parent, attr(this.parent, this.foreignKey), read(owner, this.localKey));
    return this.parent;
  }

  dissociate(): Model {
    Reflect.set(this.parent, attr(this.parent, this.foreignKey), null);
    return this.parent;
  }
}
