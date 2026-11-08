import HttpError from '../../error.js';
import { pluralize, toSnake } from '../database/support.js';
import { DB, type Row } from '../query/index.js';
import { castGet, castSet, type Cast } from './casts.js';
import { ModelQuery } from './ModelQuery.js';
import { same, toCamel } from './support.js';

type Attributes = Record<string, unknown>;

export interface ModelConstructor<T extends Model> {
  new (): T;
  readonly name: string;
  primaryKey: string;
  softDeletes: boolean;
  deletedAt: string;
  tableName(): string;
}

export abstract class Model {
  static table: string | undefined = undefined;
  static primaryKey = 'id';
  static timestamps = true;
  static softDeletes = false;
  static camelCase = true;
  static createdAt = 'created_at';
  static updatedAt = 'updated_at';
  static deletedAt = 'deleted_at';
  static fillable: string[] = [];
  static hidden: string[] = [];
  static casts: Record<string, Cast> = {};

  static tableName(): string {
    return this.table ?? pluralize(toSnake(this.name));
  }

  static columnFor(attribute: string): string {
    return this.camelCase ? toSnake(attribute) : attribute;
  }

  static attributeFor(column: string): string {
    return this.camelCase ? toCamel(column) : column;
  }

  static query<T extends Model>(this: ModelConstructor<T>): ModelQuery<T> {
    return new ModelQuery(this);
  }

  static where<T extends Model>(
    this: ModelConstructor<T>,
    ...args: Parameters<ModelQuery<T>['where']>
  ): ModelQuery<T> {
    return new ModelQuery(this).where(...args);
  }

  static all<T extends Model>(this: ModelConstructor<T>): Promise<T[]> {
    return new ModelQuery(this).get();
  }

  static find<T extends Model>(this: ModelConstructor<T>, id: string | number): Promise<T | null> {
    return new ModelQuery(this).find(id);
  }

  static findOrFail<T extends Model>(this: ModelConstructor<T>, id: string | number): Promise<T> {
    return new ModelQuery(this).findOrFail(id);
  }

  static async create<T extends Model>(this: ModelConstructor<T>, data: Attributes): Promise<T> {
    const model = new this();
    model.fill(data);
    await model.save();
    return model;
  }

  $attributes: Attributes = {};
  $original: Attributes = {};
  $exists = false;

  constructor() {
    return new Proxy(this, {
      get: (target, prop, receiver) =>
        typeof prop === 'symbol' || prop in target ? Reflect.get(target, prop, receiver) : target.$attributes[prop],
      set: (target, prop, value) => {
        if (typeof prop === 'symbol' || prop in target) return Reflect.set(target, prop, value);
        target.$attributes[prop] = value;
        return true;
      },
    });
  }

  private model(): typeof Model {
    return this.constructor as typeof Model;
  }

  $hydrate(row: Row): this {
    const model = this.model();
    this.$attributes = {};
    for (const [column, value] of Object.entries(row)) {
      const attribute = model.attributeFor(column);
      this.$attributes[attribute] = castGet(model.casts[attribute], value);
    }
    this.$original = { ...this.$attributes };
    this.$exists = true;
    return this;
  }

  fill(data: Attributes): this {
    const { fillable } = this.model();
    const all = fillable.includes('*');
    for (const [key, value] of Object.entries(data)) {
      if (all || fillable.includes(key)) this.$attributes[key] = value;
    }
    return this;
  }

  forceFill(data: Attributes): this {
    Object.assign(this.$attributes, data);
    return this;
  }

  getKey(): string | number {
    const model = this.model();
    return this.$attributes[model.attributeFor(model.primaryKey)] as string | number;
  }

  getDirty(): Attributes {
    const dirty: Attributes = {};
    for (const [key, value] of Object.entries(this.$attributes)) {
      if (!(key in this.$original) || !same(value, this.$original[key])) dirty[key] = value;
    }
    return dirty;
  }

  isDirty(key?: string): boolean {
    const dirty = this.getDirty();
    return key === undefined ? Object.keys(dirty).length > 0 : key in dirty;
  }

  trashed(): boolean {
    const model = this.model();
    return model.softDeletes && (this.$attributes[model.attributeFor(model.deletedAt)] ?? null) !== null;
  }

  async save(): Promise<this> {
    const model = this.model();
    const table = model.tableName();
    const keyAttr = model.attributeFor(model.primaryKey);
    const createdAttr = model.attributeFor(model.createdAt);
    const updatedAttr = model.attributeFor(model.updatedAt);

    await this.fire('saving');

    if (!this.$exists) {
      await this.fire('creating');

      if (model.timestamps) {
        const now = new Date();
        this.$attributes[createdAttr] ??= now;
        this.$attributes[updatedAttr] ??= now;
      }

      const row = this.toRow(this.$attributes);
      if (this.$attributes[keyAttr] === undefined || this.$attributes[keyAttr] === null) {
        const id = await DB.table(table).insertGetId(row, model.primaryKey);
        this.$attributes[keyAttr] = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
      } else {
        await DB.table(table).insert(row);
      }

      this.$exists = true;
      this.$original = { ...this.$attributes };
      await this.fire('created');
    } else {
      await this.fire('updating');

      const dirty = this.getDirty();
      if (Object.keys(dirty).length) {
        if (model.timestamps) dirty[updatedAttr] = this.$attributes[updatedAttr] = new Date();
        await DB.table(table).where(model.primaryKey, this.getKey()).update(this.toRow(dirty));
        this.$original = { ...this.$attributes };
      }
      await this.fire('updated');
    }

    await this.fire('saved');
    return this;
  }

  update(data: Attributes): Promise<this> {
    return this.fill(data).save();
  }

  async delete(): Promise<boolean> {
    if (!this.$exists) return false;
    const model = this.model();

    await this.fire('deleting');
    const query = DB.table(model.tableName()).where(model.primaryKey, this.getKey());

    if (model.softDeletes) {
      const now = new Date();
      await query.update({ [model.deletedAt]: now });
      const attribute = model.attributeFor(model.deletedAt);
      this.$attributes[attribute] = now;
      this.$original[attribute] = now;
    } else {
      await query.delete();
      this.$exists = false;
    }
    await this.fire('deleted');
    return true;
  }

  async forceDelete(): Promise<boolean> {
    if (!this.$exists) return false;
    const model = this.model();
    await DB.table(model.tableName()).where(model.primaryKey, this.getKey()).delete();
    this.$exists = false;
    return true;
  }

  async restore(): Promise<this> {
    const model = this.model();
    if (!model.softDeletes) return this;
    await DB.table(model.tableName()).where(model.primaryKey, this.getKey()).update({ [model.deletedAt]: null });
    const attribute = model.attributeFor(model.deletedAt);
    this.$attributes[attribute] = null;
    this.$original[attribute] = null;
    return this;
  }

  async refresh(): Promise<this> {
    const model = this.model();
    const row = await DB.table(model.tableName()).where(model.primaryKey, this.getKey()).first();
    if (!row) throw HttpError.notFound(`${model.name} not found.`);
    return this.$hydrate(row);
  }

  toObject(): Attributes {
    const hidden = new Set(this.model().hidden);
    return Object.fromEntries(Object.entries(this.$attributes).filter(([key]) => !hidden.has(key)));
  }

  toJSON(): Attributes {
    return this.toObject();
  }

  private toRow(attributes: Attributes): Row {
    const model = this.model();
    const row: Row = {};
    for (const [key, value] of Object.entries(attributes)) row[model.columnFor(key)] = castSet(model.casts[key], value);
    return row;
  }

  private async fire(event: string): Promise<void> {
    const hook: unknown = Reflect.get(this, event);
    if (typeof hook === 'function') await hook.call(this);
  }
}
