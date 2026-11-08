import type { Request } from 'express';
import Validator from '../validation/Validator.js';
import { getByPath, hasPath, isBlank, setByPath } from '../validation/helpers.js';
import type { Attributes, Data, Messages, Rules } from '../validation/types.js';

const isObject = (value: unknown): value is Data =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const TRUE = [true, 1, '1', 'true', 'on', 'yes'];

/** Laravel-style wrapper around the Express request. The original is always available as `req.raw`. */
export class HttpRequest {
  private extra: Data = {};
  private clean: Data | undefined;

  constructor(readonly raw: Request) {}

  get body(): Data {
    return isObject(this.raw.body) ? this.raw.body : {};
  }

  get params(): Record<string, string> {
    return (this.raw.params ?? {}) as Record<string, string>;
  }

  get headers(): Request['headers'] {
    return this.raw.headers;
  }

  get cookies(): Record<string, string> {
    return (this.raw.cookies ?? {}) as Record<string, string>;
  }

  get user(): any {
    return this.raw.user;
  }

  get auth(): any {
    return this.raw.auth;
  }

  all(): Data {
    return { ...this.query(), ...this.body, ...this.extra };
  }

  input(): Data;
  input(key: string, fallback?: unknown): any;
  input(key?: string, fallback?: unknown): any {
    const data = this.all();
    if (key === undefined) return data;
    return hasPath(data, key) ? getByPath(data, key) : fallback;
  }

  query(): Data;
  query(key: string, fallback?: unknown): any;
  query(key?: string, fallback?: unknown): any {
    const data = (this.raw.query ?? {}) as Data;
    if (key === undefined) return data;
    return hasPath(data, key) ? getByPath(data, key) : fallback;
  }

  post(): Data;
  post(key: string, fallback?: unknown): any;
  post(key?: string, fallback?: unknown): any {
    const data = this.body;
    if (key === undefined) return data;
    return hasPath(data, key) ? getByPath(data, key) : fallback;
  }

  route(): Record<string, string>;
  route(key: string, fallback?: string): string | undefined;
  route(key?: string, fallback?: string): Record<string, string> | string | undefined {
    if (key === undefined) return this.params;
    return this.params[key] ?? fallback;
  }

  only(...keys: string[]): Data {
    const data = this.all();
    const picked: Data = {};
    for (const key of keys) {
      if (hasPath(data, key)) setByPath(picked, key, getByPath(data, key));
    }
    return picked;
  }

  except(...keys: string[]): Data {
    const data = this.all();
    const filtered = { ...data };
    for (const key of keys) delete filtered[key];
    return filtered;
  }

  has(...keys: string[]): boolean {
    const data = this.all();
    return keys.every((key) => hasPath(data, key));
  }

  hasAny(...keys: string[]): boolean {
    const data = this.all();
    return keys.some((key) => hasPath(data, key));
  }

  filled(...keys: string[]): boolean {
    const data = this.all();
    return keys.every((key) => !isBlank(getByPath(data, key)));
  }

  missing(...keys: string[]): boolean {
    return !this.hasAny(...keys);
  }

  string(key: string, fallback = ''): string {
    const value = this.input(key);
    return value === undefined || value === null ? fallback : String(value);
  }

  integer(key: string, fallback = 0): number {
    const value = Number.parseInt(String(this.input(key)), 10);
    return Number.isNaN(value) ? fallback : value;
  }

  boolean(key: string, fallback = false): boolean {
    const value = this.input(key);
    if (value === undefined || value === null || value === '') return fallback;
    return TRUE.includes(typeof value === 'string' ? value.toLowerCase() : value);
  }

  merge(data: Data): this {
    this.extra = { ...this.extra, ...data };
    return this;
  }

  method(): string {
    return this.raw.method;
  }

  isMethod(method: string): boolean {
    return this.raw.method.toUpperCase() === method.toUpperCase();
  }

  path(): string {
    const path = this.raw.originalUrl.split('?')[0] ?? '';
    return path.replace(/^\/+|\/+$/g, '') || '/';
  }

  url(): string {
    return `${this.raw.protocol}://${this.raw.get('host') ?? ''}${this.raw.originalUrl.split('?')[0]}`;
  }

  fullUrl(): string {
    return `${this.raw.protocol}://${this.raw.get('host') ?? ''}${this.raw.originalUrl}`;
  }

  ip(): string | undefined {
    return this.raw.ip;
  }

  header(name: string, fallback?: string): string | undefined {
    return this.raw.get(name) ?? fallback;
  }

  cookie(name: string, fallback?: string): string | undefined {
    return this.cookies[name] ?? fallback;
  }

  userAgent(): string | undefined {
    return this.header('user-agent');
  }

  bearerToken(): string | null {
    const header = this.header('authorization');
    return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
  }

  isJson(): boolean {
    return Boolean(this.raw.is('json'));
  }

  wantsJson(): boolean {
    return this.raw.accepts(['html', 'json']) === 'json';
  }

  async validate<T = Data>(rules: Rules, messages?: Messages, attributes?: Attributes): Promise<T> {
    const data = await Validator.validate<T>(this.all(), rules, messages, attributes);
    this.clean = { ...this.clean, ...(data as Data) };
    return data;
  }

  validated<T = Data>(): T {
    if (!this.clean) throw new Error('Nothing has been validated yet. Call validate() or use a FormRequest.');
    return this.clean as T;
  }
}
