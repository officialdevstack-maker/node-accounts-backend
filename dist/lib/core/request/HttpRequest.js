import Validator from '../validation/Validator.js';
import { getByPath, hasPath, isBlank, setByPath } from '../validation/helpers.js';
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const TRUE = [true, 1, '1', 'true', 'on', 'yes'];
/** Laravel-style wrapper around the Express request. The original is always available as `req.raw`. */
export class HttpRequest {
    raw;
    extra = {};
    clean;
    constructor(raw) {
        this.raw = raw;
    }
    get body() {
        return isObject(this.raw.body) ? this.raw.body : {};
    }
    get params() {
        return (this.raw.params ?? {});
    }
    get headers() {
        return this.raw.headers;
    }
    get cookies() {
        return (this.raw.cookies ?? {});
    }
    get user() {
        return this.raw.user;
    }
    get auth() {
        return this.raw.auth;
    }
    all() {
        return { ...this.query(), ...this.body, ...this.extra };
    }
    input(key, fallback) {
        const data = this.all();
        if (key === undefined)
            return data;
        return hasPath(data, key) ? getByPath(data, key) : fallback;
    }
    query(key, fallback) {
        const data = (this.raw.query ?? {});
        if (key === undefined)
            return data;
        return hasPath(data, key) ? getByPath(data, key) : fallback;
    }
    post(key, fallback) {
        const data = this.body;
        if (key === undefined)
            return data;
        return hasPath(data, key) ? getByPath(data, key) : fallback;
    }
    route(key, fallback) {
        if (key === undefined)
            return this.params;
        return this.params[key] ?? fallback;
    }
    only(...keys) {
        const data = this.all();
        const picked = {};
        for (const key of keys) {
            if (hasPath(data, key))
                setByPath(picked, key, getByPath(data, key));
        }
        return picked;
    }
    except(...keys) {
        const data = this.all();
        const filtered = { ...data };
        for (const key of keys)
            delete filtered[key];
        return filtered;
    }
    has(...keys) {
        const data = this.all();
        return keys.every((key) => hasPath(data, key));
    }
    hasAny(...keys) {
        const data = this.all();
        return keys.some((key) => hasPath(data, key));
    }
    filled(...keys) {
        const data = this.all();
        return keys.every((key) => !isBlank(getByPath(data, key)));
    }
    missing(...keys) {
        return !this.hasAny(...keys);
    }
    string(key, fallback = '') {
        const value = this.input(key);
        return value === undefined || value === null ? fallback : String(value);
    }
    integer(key, fallback = 0) {
        const value = Number.parseInt(String(this.input(key)), 10);
        return Number.isNaN(value) ? fallback : value;
    }
    boolean(key, fallback = false) {
        const value = this.input(key);
        if (value === undefined || value === null || value === '')
            return fallback;
        return TRUE.includes(typeof value === 'string' ? value.toLowerCase() : value);
    }
    merge(data) {
        this.extra = { ...this.extra, ...data };
        return this;
    }
    method() {
        return this.raw.method;
    }
    isMethod(method) {
        return this.raw.method.toUpperCase() === method.toUpperCase();
    }
    path() {
        const path = this.raw.originalUrl.split('?')[0] ?? '';
        return path.replace(/^\/+|\/+$/g, '') || '/';
    }
    url() {
        return `${this.raw.protocol}://${this.raw.get('host') ?? ''}${this.raw.originalUrl.split('?')[0]}`;
    }
    fullUrl() {
        return `${this.raw.protocol}://${this.raw.get('host') ?? ''}${this.raw.originalUrl}`;
    }
    ip() {
        return this.raw.ip;
    }
    header(name, fallback) {
        return this.raw.get(name) ?? fallback;
    }
    cookie(name, fallback) {
        return this.cookies[name] ?? fallback;
    }
    userAgent() {
        return this.header('user-agent');
    }
    bearerToken() {
        const header = this.header('authorization');
        return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
    }
    isJson() {
        return Boolean(this.raw.is('json'));
    }
    wantsJson() {
        return this.raw.accepts(['html', 'json']) === 'json';
    }
    async validate(rules, messages, attributes) {
        const data = await Validator.validate(this.all(), rules, messages, attributes);
        this.clean = { ...this.clean, ...data };
        return data;
    }
    validated() {
        if (!this.clean)
            throw new Error('Nothing has been validated yet. Call validate() or use a FormRequest.');
        return this.clean;
    }
}
//# sourceMappingURL=HttpRequest.js.map