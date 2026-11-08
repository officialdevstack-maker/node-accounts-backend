import HttpError from '../../error.js';
import { inspect } from 'node:util';
import { config } from '../config/index.js';
import { pluralize, toSnake } from '../database/support.js';
import { DB, type Row } from '../query/index.js';
import type { Connection } from '../query/Connection.js';
import { castGet, castSet, type Cast } from './casts.js';
import { ModelQuery } from './ModelQuery.js';
import { same, snapshot, toCamel } from './support.js';

type Attributes = Record<string, unknown>;
const reverseColumns = new WeakMap<typeof Model, Map<string, string>>();
const warnedUncastModels = new WeakSet<typeof Model>();

export interface ModelConstructor<T extends Model> {
  new (): T;
  readonly name: string;
  primaryKey: string;
  softDeletes: boolean;
  deletedAt: string;
  casts: Record<string, Cast>;
  columnFor(attribute: string): string;
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
  static columns: Record<string, string> = {};
  static versionColumn: string | undefined = undefined;
  static transactional = false;

  static reserved(attribute: string): boolean {
    let prototype: object | null = this.prototype;
    while (prototype) {
      if (Object.prototype.hasOwnProperty.call(prototype, attribute)) return true;
      prototype = Object.getPrototypeOf(prototype) as object | null;
    }
    return false;
  }

  static tableName(): string {
    return this.table ?? pluralize(toSnake(this.name));
  }

  static columnFor(attribute: string): string {
    return this.columns[attribute] ?? (this.camelCase ? toSnake(attribute) : attribute);
  }

  static attributeFor(column: string): string {
    let reverse = reverseColumns.get(this);
    if (!reverse) {
      reverse = new Map(Object.entries(this.columns).map(([attribute, name]) => [name, attribute]));
      reverseColumns.set(this, reverse);
    }

    const overridden = reverse.get(column);
    if (overridden !== undefined) return overridden;

    const attribute = this.camelCase ? toCamel(column) : column;
    // address_2, api_url and userID are known camel/snake mapping failure cases.
    if (this.camelCase && this.columnFor(attribute) !== column && this.columns[attribute] === undefined) {
      throw new Error(`Column "${column}" cannot be mapped reversibly. Add it to static columns or set camelCase = false.`);
    }
    return attribute;
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

  static findOrFail<T extends Model>(
    this: ModelConstructor<T>,
    id: string | number,
    options: { lockForUpdate?: boolean } = {},
  ): Promise<T> {
    const query = new ModelQuery(this);
    if (options.lockForUpdate) query.lockForUpdate();
    return query.findOrFail(id);
  }

  static async create<T extends Model>(this: ModelConstructor<T>, data: Attributes): Promise<T> {
    const model = new this();
    model.fill(data);
    await model.save();
    return model;
  }

  $attributes!: Attributes;
  $original!: Attributes;
  $changes!: Attributes;
  $exists!: boolean;
  $secrets!: Attributes;
  $loadedHidden!: boolean;

  constructor() {
    Object.defineProperties(this, {
      $attributes: { value: {}, writable: true, configurable: true, enumerable: false },
      $original: { value: {}, writable: true, configurable: true, enumerable: false },
      $changes: { value: {}, writable: true, configurable: true, enumerable: false },
      $exists: { value: false, writable: true, configurable: true, enumerable: false },
      $secrets: { value: {}, writable: true, configurable: true, enumerable: false },
      $loadedHidden: { value: false, writable: true, configurable: true, enumerable: false },
    });

    return new Proxy(this, {
      get: (target, prop, receiver) =>
        typeof prop === 'symbol' || prop in target ? Reflect.get(target, prop, receiver) : target.$attributes[prop],
      set: (target, prop, value) => {
        if (typeof prop === 'symbol') return Reflect.set(target, prop, value);
        if (prop in target) {
          target.$assertNotReserved(prop);
          return Reflect.set(target, prop, value);
        }
        target.$attributes[prop] = castGet(target.$model().casts[prop], value);
        return true;
      },
      has: (target, prop) =>
        typeof prop === 'string' && Object.prototype.hasOwnProperty.call(target.$attributes, prop)
          ? true
          : Reflect.has(target, prop),
      ownKeys: (target) => [
        ...Reflect.ownKeys(target).filter((key) => {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
          return descriptor !== undefined && !descriptor.configurable;
        }),
        ...Object.keys(target.$attributes),
      ],
      getOwnPropertyDescriptor: (target, prop) => {
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(target.$attributes, prop)) {
          return { configurable: true, enumerable: true, writable: true, value: target.$attributes[prop] };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
      deleteProperty: (target, prop) => {
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(target.$attributes, prop)) {
          delete target.$attributes[prop];
          return true;
        }
        return Reflect.deleteProperty(target, prop);
      },
    });
  }

  $hydrate(row: Row, withHidden = false): this {
    const model = this.$model();
    this.$attributes = {};
    this.$secrets = {};
    this.$loadedHidden = withHidden;
    const hidden = new Set(model.hidden);
    for (const [column, value] of Object.entries(row)) {
      const attribute = model.attributeFor(column);
      this.$assertNotReserved(attribute);
      this.$warnForUncastValue(model, attribute, value);
      if (hidden.has(attribute)) {
        if (withHidden) this.$secrets[attribute] = castGet(model.casts[attribute], value);
      } else {
        this.$attributes[attribute] = castGet(model.casts[attribute], value);
      }
    }
    this.$original = snapshot(this.$attributes);
    this.$changes = {};
    this.$exists = true;
    return this;
  }

  fill(data: Attributes): this {
    const model = this.$model();
    const { fillable } = model;
    const all = fillable.includes('*');
    for (const [key, value] of Object.entries(data)) {
      this.$assertNotReserved(key);
      if (all || fillable.includes(key)) {
        this.$attributes[key] = castGet(model.casts[key], value);
      }
    }
    return this;
  }

  forceFill(data: Attributes): this {
    for (const [key, value] of Object.entries(data)) {
      this.$assertNotReserved(key);
      this.$attributes[key] = castGet(this.$model().casts[key], value);
    }
    return this;
  }

  getKey(): string | number {
    const model = this.$model();
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

  getChanges(): Attributes {
    return snapshot(this.$changes);
  }

  wasChanged(key?: string): boolean {
    return key === undefined ? Object.keys(this.$changes).length > 0 : key in this.$changes;
  }

  getHidden(key: string): unknown {
    if (!this.$loadedHidden) {
      throw new Error(`${this.$model().name} was loaded without withHidden().`);
    }
    if (!this.$model().hidden.includes(key)) {
      throw new Error(`Column "${key}" is not hidden on ${this.$model().name}.`);
    }
    if (!Object.prototype.hasOwnProperty.call(this.$secrets, key)) {
      throw new Error(`Hidden column "${key}" was not loaded on ${this.$model().name}.`);
    }
    return this.$secrets[key];
  }

  trashed(): boolean {
    const model = this.$model();
    return model.softDeletes && (this.$attributes[model.attributeFor(model.deletedAt)] ?? null) !== null;
  }

  async save(options: { connection?: Connection } = {}): Promise<this> {
    const model = this.$model();
    if (model.transactional) {
      return DB.transaction((connection) => this.$save({ connection }), options.connection);
    }
    return this.$save(options);
  }

  private async $save(options: { connection?: Connection }): Promise<this> {
    const model = this.$model();
    const connection = options.connection ?? DB.connection();
    const table = model.tableName();
    const keyAttr = model.attributeFor(model.primaryKey);
    const createdAttr = model.attributeFor(model.createdAt);
    const updatedAttr = model.attributeFor(model.updatedAt);

    this.$changes = {};
    if (await this.$fire('saving') === false) return this;

    if (!this.$exists) {
      if (await this.$fire('creating') === false) return this;

      if (model.timestamps) {
        const now = new Date();
        this.$attributes[createdAttr] ??= now;
        this.$attributes[updatedAttr] ??= now;
      }

      const row = this.$toRow(this.$attributes);
      if (this.$attributes[keyAttr] === undefined || this.$attributes[keyAttr] === null) {
        const id = await connection.table(table).insertGetId(row, model.primaryKey);
        this.$attributes[keyAttr] = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
      } else {
        await connection.table(table).insert(row);
      }

      this.$exists = true;
      this.$changes = snapshot(this.$attributes);
      this.$original = snapshot(this.$attributes);
      await this.$fire('created');
    } else {
      if (await this.$fire('updating') === false) return this;

      const dirty = this.getDirty();
      if (Object.keys(dirty).length) {
        if (model.timestamps) dirty[updatedAttr] = this.$attributes[updatedAttr] = new Date();
        if (model.versionColumn) {
          const versionAttribute = model.attributeFor(model.versionColumn);
          const expectedVersion = this.$attributes[versionAttribute];
          if (expectedVersion === undefined || expectedVersion === null) {
            throw new Error(`Model ${model.name} is missing loaded version column "${model.versionColumn}".`);
          }
          const update = this.$toRow(dirty);
          delete update[model.versionColumn];
          const affected = await connection.table(table)
            .where(model.primaryKey, this.getKey())
            .where(model.versionColumn, expectedVersion)
            .increment(model.versionColumn, 1, update);
          if (affected === 0) {
            throw new HttpError(409, 'The record was changed by someone else. Reload and try again.');
          }
          const nextVersion = await connection.table(table)
            .where(model.primaryKey, this.getKey())
            .value(model.versionColumn);
          this.$attributes[versionAttribute] = castGet(model.casts[versionAttribute], nextVersion);
          dirty[versionAttribute] = this.$attributes[versionAttribute];
        } else {
          await connection.table(table).where(model.primaryKey, this.getKey()).update(this.$toRow(dirty));
        }
        this.$changes = snapshot(dirty);
        this.$original = snapshot(this.$attributes);
      }
      await this.$fire('updated');
    }

    await this.$fire('saved');
    return this;
  }

  update(data: Attributes): Promise<this> {
    return this.fill(data).save();
  }

  async delete(options: { connection?: Connection } = {}): Promise<boolean> {
    if (!this.$exists) return false;
    const model = this.$model();
    if (model.transactional) {
      return DB.transaction((connection) => this.$delete({ connection }), options.connection);
    }
    return this.$delete(options);
  }

  private async $delete(options: { connection?: Connection }): Promise<boolean> {
    if (!this.$exists) return false;
    const model = this.$model();
    const connection = options.connection ?? DB.connection();

    if (await this.$fire('deleting') === false) return false;
    const query = connection.table(model.tableName()).where(model.primaryKey, this.getKey());

    if (model.softDeletes) {
      const now = new Date();
      await query.update({ [model.deletedAt]: now });
      const attribute = model.attributeFor(model.deletedAt);
      this.$attributes[attribute] = now;
      this.$original = snapshot(this.$attributes);
      this.$changes = { [attribute]: snapshot(now) };
    } else {
      await query.delete();
      this.$exists = false;
    }
    await this.$fire('deleted');
    return true;
  }

  increment(attribute: string, amount = 1, extra: Attributes = {}): Promise<this> {
    return this.$step(attribute, amount, '+', extra);
  }

  decrement(attribute: string, amount = 1, extra: Attributes = {}): Promise<this> {
    return this.$step(attribute, amount, '-', extra);
  }

  private async $step(attribute: string, amount: number, direction: '+' | '-', extra: Attributes): Promise<this> {
    if (!this.$exists) throw new Error(`Cannot ${direction === '+' ? 'increment' : 'decrement'} an unsaved ${this.$model().name}.`);

    const model = this.$model();
    const connection = DB.connection();
    const column = model.columnFor(attribute);
    const extraRow = this.$toRow(extra);
    const query = connection.table(model.tableName()).where(model.primaryKey, this.getKey());
    if (direction === '+') await query.increment(column, amount, extraRow);
    else await query.decrement(column, amount, extraRow);

    const selected = [column, ...Object.keys(extraRow)];
    const row = await connection.table(model.tableName())
      .where(model.primaryKey, this.getKey())
      .first([...new Set(selected)]);
    if (!row) throw HttpError.notFound(`${model.name} not found.`);

    this.$changes = {};
    for (const [dbColumn, value] of Object.entries(row)) {
      const key = model.attributeFor(dbColumn);
      this.$attributes[key] = castGet(model.casts[key], value);
      this.$original[key] = snapshot(this.$attributes[key]);
      this.$changes[key] = snapshot(this.$attributes[key]);
    }
    await this.$fire('updated');
    return this;
  }

  async forceDelete(): Promise<boolean> {
    if (!this.$exists) return false;
    const model = this.$model();
    await DB.table(model.tableName()).where(model.primaryKey, this.getKey()).delete();
    this.$exists = false;
    return true;
  }

  async restore(): Promise<this> {
    const model = this.$model();
    if (!model.softDeletes) return this;
    await DB.table(model.tableName()).where(model.primaryKey, this.getKey()).update({ [model.deletedAt]: null });
    const attribute = model.attributeFor(model.deletedAt);
    this.$attributes[attribute] = null;
    this.$original = snapshot(this.$attributes);
    this.$changes = { [attribute]: null };
    return this;
  }

  async refresh(): Promise<this> {
    const model = this.$model();
    const row = await DB.table(model.tableName()).where(model.primaryKey, this.getKey()).first();
    if (!row) throw HttpError.notFound(`${model.name} not found.`);
    return this.$hydrate(row);
  }

  toObject(): Attributes {
    const hidden = new Set(this.$model().hidden);
    return Object.fromEntries(Object.entries(this.$attributes).filter(([key]) => !hidden.has(key)));
  }

  toJSON(): Attributes {
    return this.toObject();
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `${this.constructor.name} ${inspect(this.toObject())}`;
  }

  private $toRow(attributes: Attributes): Row {
    const model = this.$model();
    const row: Row = {};
    for (const [key, value] of Object.entries(attributes)) row[model.columnFor(key)] = castSet(model.casts[key], value);
    return row;
  }

  private $model(): typeof Model {
    return this.constructor as typeof Model;
  }

  private $assertNotReserved(attribute: string): void {
    const model = this.$model();
    if (model.reserved(attribute)) {
      throw new Error(`Column "${attribute}" on ${model.name} collides with a model method. Rename the attribute via static columns.`);
    }
  }

  private $warnForUncastValue(model: typeof Model, attribute: string, value: unknown): void {
    if (model.casts[attribute] !== undefined || config('app.env') === 'production' || warnedUncastModels.has(model)) return;
    const suspiciousBoolean = typeof value === 'number' && (value === 0 || value === 1);
    const suspiciousDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(value);
    if (!suspiciousBoolean && !suspiciousDate) return;

    warnedUncastModels.add(model);
    console.warn(`Model ${model.name} hydrated uncast column "${attribute}" with a ${suspiciousBoolean ? '0/1 value' : 'date-like string'}. Declare a cast for this attribute.`);
  }

  private async $fire(event: 'saving' | 'saved' | 'creating' | 'created' | 'updating' | 'updated' | 'deleting' | 'deleted'): Promise<unknown> {
    const hook: unknown = Reflect.get(this, event);
    if (typeof hook === 'function') return hook.call(this);
  }
}
