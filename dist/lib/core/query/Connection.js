import { QueryBuilder } from './Builder.js';
import { grammarFor } from './grammar/index.js';
import { Raw } from './Raw.js';
import { normalizeBinding } from './support.js';
export class Connection {
    pool;
    pinned;
    static listeners = [];
    grammar = grammarFor('mysql');
    inTransaction = false;
    /** `session` is set when this connection is pinned to one physical connection (transactions, SET ...). */
    constructor(pool, pinned) {
        this.pool = pool;
        this.pinned = pinned;
    }
    get dialect() {
        return this.grammar.dialect;
    }
    get runner() {
        return (this.pinned ?? this.pool);
    }
    table(name) {
        return new QueryBuilder(this).from(name);
    }
    query() {
        return new QueryBuilder(this);
    }
    raw(sql, bindings = []) {
        return new Raw(sql, bindings);
    }
    async select(sql, bindings = []) {
        const params = bindings.map(normalizeBinding);
        const [rows] = await this.run(sql, params, () => this.runner.query(sql, params));
        return rows;
    }
    async selectOne(sql, bindings = []) {
        return (await this.select(sql, bindings))[0] ?? null;
    }
    async insert(sql, bindings = []) {
        await this.execute(sql, bindings);
        return true;
    }
    async update(sql, bindings = []) {
        return (await this.execute(sql, bindings)).affectedRows;
    }
    async delete(sql, bindings = []) {
        return (await this.execute(sql, bindings)).affectedRows;
    }
    async statement(sql, bindings = []) {
        await this.execute(sql, bindings);
    }
    async execute(sql, bindings = []) {
        const params = bindings.map(normalizeBinding);
        const [result] = await this.run(sql, params, () => this.runner.query(sql, params));
        if (Array.isArray(result))
            return { rows: result, affectedRows: result.length, insertId: undefined };
        const header = result;
        return { rows: [], affectedRows: Number(header.affectedRows ?? 0), insertId: header.insertId || undefined };
    }
    /** Run `callback` on one physical connection (needed for SET ..., transactions). */
    async session(callback) {
        if (this.pinned)
            return callback(this);
        const physical = await this.pool.getConnection();
        try {
            return await callback(new Connection(this.pool, physical));
        }
        finally {
            physical.release();
        }
    }
    async transaction(callback) {
        if (this.inTransaction)
            return callback(this);
        return this.session(async (trx) => {
            trx.inTransaction = true;
            await trx.statement('START TRANSACTION');
            try {
                const result = await callback(trx);
                await trx.statement('COMMIT');
                return result;
            }
            catch (error) {
                await trx.statement('ROLLBACK').catch(() => undefined);
                throw error;
            }
        });
    }
    async run(sql, bindings, execute) {
        const started = Date.now();
        try {
            return await execute();
        }
        finally {
            const event = { sql, bindings, ms: Date.now() - started, dialect: this.dialect };
            for (const listener of Connection.listeners) {
                try {
                    listener(event);
                }
                catch {
                    // a broken logger must never break a query
                }
            }
        }
    }
}
//# sourceMappingURL=Connection.js.map