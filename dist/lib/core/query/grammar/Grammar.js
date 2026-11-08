import { Raw } from '../Raw.js';
import { normalizeBinding } from '../support.js';
export class Grammar {
    limitedWrites = false;
    wrap(value) {
        if (/[()]/.test(value))
            throw new Error(`"${value}" looks like an expression. Wrap it with DB.raw() (or use selectRaw / whereRaw).`);
        const alias = value.match(/^(.+?)\s+as\s+(.+)$/i);
        if (alias)
            return `${this.wrap(alias[1])} as ${this.segment(alias[2].trim())}`;
        return value.split('.').map((part) => this.segment(part.trim())).join('.');
    }
    segment(name) {
        return name === '*' ? name : `${this.quote}${name.replaceAll(this.quote, this.quote + this.quote)}${this.quote}`;
    }
    column(value, s) {
        if (value instanceof Raw) {
            s.bindings.push(...value.bindings.map(normalizeBinding));
            return value.value;
        }
        return this.wrap(value);
    }
    source(source, s) {
        if (typeof source === 'string')
            return this.wrap(source);
        if (source instanceof Raw)
            return this.column(source, s);
        return `(${this.select(source.query, s)}) as ${this.wrap(source.alias)}`;
    }
    param(value, s) {
        if (value instanceof Raw)
            return this.column(value, s);
        s.bindings.push(normalizeBinding(value));
        return '?';
    }
    params(values, s) {
        return values.map((value) => this.param(value, s)).join(', ');
    }
    operator(op) {
        return op.replace(/^(not )?ilike$/, '$1like');
    }
    lock(_mode) {
        return '';
    }
    insertVerb(_ignore) {
        return 'insert into';
    }
    ignoreSuffix() {
        return '';
    }
    returning(_column) {
        return '';
    }
    emptyInsert() {
        return 'default values';
    }
    limitOffset(limit, offset) {
        const parts = [];
        if (limit !== undefined)
            parts.push(`limit ${limit}`);
        if (offset !== undefined)
            parts.push(`offset ${offset}`);
        return parts;
    }
    compileSelect(query) {
        const s = { bindings: [] };
        return { sql: this.select(query, s), bindings: s.bindings };
    }
    compileExists(query) {
        const s = { bindings: [] };
        return { sql: `select exists(${this.select(query, s)}) as ${this.wrap('exists')}`, bindings: s.bindings };
    }
    select(q, s) {
        const hasUnions = q.unions.length > 0;
        const parts = [this.columns(q, s)];
        if (q.fromSource !== undefined)
            parts.push(`from ${this.source(q.fromSource, s)}`);
        for (const join of q.joins)
            parts.push(this.join(join, s));
        const where = this.whereBody(q.wheres, s);
        if (where)
            parts.push(`where ${where}`);
        if (q.groups.length)
            parts.push(`group by ${q.groups.map((g) => this.column(g, s)).join(', ')}`);
        const having = this.havingBody(q.havings, s);
        if (having)
            parts.push(`having ${having}`);
        if (!hasUnions)
            parts.push(...this.orderLimit(q, s));
        let sql = parts.join(' ');
        for (const union of q.unions)
            sql += ` union${union.all ? ' all' : ''} ${this.select(union.query, s)}`;
        if (hasUnions) {
            const tail = this.orderLimit(q, s);
            if (tail.length)
                sql += ` ${tail.join(' ')}`;
        }
        if (q.lockMode) {
            const lock = this.lock(q.lockMode);
            if (lock)
                sql += ` ${lock}`;
        }
        return sql;
    }
    columns(q, s) {
        if (q.aggregateSpec) {
            const column = this.column(q.aggregateSpec.column, s);
            const distinct = q.isDistinct && column !== '*' ? 'distinct ' : '';
            return `select ${q.aggregateSpec.fn}(${distinct}${column}) as ${this.wrap('aggregate')}`;
        }
        const list = q.columns.length ? q.columns.map((c) => this.column(c, s)).join(', ') : '*';
        return `select ${q.isDistinct ? 'distinct ' : ''}${list}`;
    }
    join(join, s) {
        const table = this.source(join.source, s);
        if (join.kind === 'cross')
            return `cross join ${table}`;
        const on = this.whereBody(join.wheres, s);
        return `${join.kind} join ${table}${on ? ` on ${on}` : ''}`;
    }
    orderLimit(q, s) {
        const parts = [];
        if (q.orders.length)
            parts.push(`order by ${q.orders.map((o) => this.order(o, s)).join(', ')}`);
        parts.push(...this.limitOffset(q.limitValue, q.offsetValue));
        return parts;
    }
    order(order, s) {
        switch (order.type) {
            case 'column':
                return `${this.column(order.column, s)} ${order.direction}`;
            case 'raw':
                s.bindings.push(...order.bindings.map(normalizeBinding));
                return order.sql;
            case 'random':
                return this.random();
        }
    }
    whereBody(wheres, s) {
        let out = '';
        for (const where of wheres) {
            const part = this.where(where, s);
            if (!part)
                continue;
            out += out ? ` ${where.boolean} ${part}` : part;
        }
        return out;
    }
    where(w, s) {
        switch (w.type) {
            case 'basic': {
                const column = this.column(w.column, s);
                return `${column} ${this.operator(w.operator)} ${this.param(w.value, s)}`;
            }
            case 'column': {
                const first = this.column(w.first, s);
                return `${first} ${this.operator(w.operator)} ${this.column(w.second, s)}`;
            }
            case 'sub': {
                const column = this.column(w.column, s);
                return `${column} ${this.operator(w.operator)} (${this.select(w.query, s)})`;
            }
            case 'in': {
                const column = this.column(w.column, s);
                const keyword = w.not ? 'not in' : 'in';
                if (Array.isArray(w.values)) {
                    if (!w.values.length)
                        return w.not ? '1 = 1' : '0 = 1';
                    return `${column} ${keyword} (${this.params(w.values, s)})`;
                }
                return `${column} ${keyword} (${this.select(w.values, s)})`;
            }
            case 'null':
                return `${this.column(w.column, s)} is ${w.not ? 'not ' : ''}null`;
            case 'between': {
                const column = this.column(w.column, s);
                return `${column} ${w.not ? 'not between' : 'between'} ${this.param(w.values[0], s)} and ${this.param(w.values[1], s)}`;
            }
            case 'nested': {
                const body = this.whereBody(w.query.wheres, s);
                return body ? `(${body})` : '';
            }
            case 'exists':
                return `${w.not ? 'not exists' : 'exists'} (${this.select(w.query, s)})`;
            case 'raw':
                s.bindings.push(...w.bindings.map(normalizeBinding));
                return w.sql;
            case 'date': {
                const column = this.dateExpr(w.part, this.column(w.column, s));
                return `${column} ${this.operator(w.operator)} ${this.param(w.value, s)}`;
            }
        }
    }
    havingBody(havings, s) {
        let out = '';
        for (const having of havings) {
            let part;
            if (having.type === 'raw') {
                s.bindings.push(...having.bindings.map(normalizeBinding));
                part = having.sql;
            }
            else {
                const column = this.column(having.column, s);
                part = `${column} ${this.operator(having.operator)} ${this.param(having.value, s)}`;
            }
            out += out ? ` ${having.boolean} ${part}` : part;
        }
        return out;
    }
    insert(table, rows, options = {}) {
        const s = { bindings: [] };
        const ignore = options.ignore === true;
        const head = `${this.insertVerb(ignore)} ${this.wrap(table)}`;
        const tail = `${ignore ? this.ignoreSuffix() : ''}${options.returning ? this.returning(options.returning) : ''}`;
        const columns = Object.keys(rows[0] ?? {});
        if (!columns.length)
            return { sql: `${head} ${this.emptyInsert()}${tail}`, bindings: [] };
        const values = rows.map((row) => `(${columns.map((c) => this.param(row[c], s)).join(', ')})`).join(', ');
        return { sql: `${head} (${columns.map((c) => this.segment(c)).join(', ')}) values ${values}${tail}`, bindings: s.bindings };
    }
    upsert(table, rows, uniqueBy, update) {
        const insert = this.insert(table, rows);
        const conflict = uniqueBy.map((c) => this.segment(c)).join(', ');
        const sets = update.map((c) => `${this.segment(c)} = ${this.segment('excluded')}.${this.segment(c)}`).join(', ');
        return { sql: `${insert.sql} on conflict (${conflict}) do update set ${sets}`, bindings: insert.bindings };
    }
    update(q, values) {
        const s = { bindings: [] };
        const table = this.writeTable(q, 'update');
        const sets = Object.entries(values)
            .map(([key, value]) => `${this.segment(key.split('.').pop().trim())} = ${this.param(value, s)}`)
            .join(', ');
        return { sql: `update ${table} set ${sets}${this.writeTail(q, s)}`, bindings: s.bindings };
    }
    delete(q) {
        const s = { bindings: [] };
        const table = this.writeTable(q, 'delete');
        return { sql: `delete from ${table}${this.writeTail(q, s)}`, bindings: s.bindings };
    }
    writeTable(q, verb) {
        if (typeof q.fromSource !== 'string')
            throw new Error(`${verb}() needs a plain table name.`);
        if (q.joins.length || q.unions.length)
            throw new Error(`${verb}() with joins is not supported, use whereIn() with a subquery.`);
        const unsupported = q.offsetValue !== undefined || (!this.limitedWrites && (q.limitValue !== undefined || q.orders.length > 0));
        if (unsupported)
            throw new Error(`${this.dialect} cannot ${verb} with ORDER BY / LIMIT / OFFSET, use whereIn() with a subquery.`);
        return this.wrap(q.fromSource);
    }
    writeTail(q, s) {
        const where = this.whereBody(q.wheres, s);
        let sql = where ? ` where ${where}` : '';
        if (this.limitedWrites) {
            if (q.orders.length)
                sql += ` order by ${q.orders.map((o) => this.order(o, s)).join(', ')}`;
            if (q.limitValue !== undefined)
                sql += ` limit ${q.limitValue}`;
        }
        return sql;
    }
}
//# sourceMappingURL=Grammar.js.map