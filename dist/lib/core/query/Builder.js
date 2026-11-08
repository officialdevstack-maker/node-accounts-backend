import { Raw } from './Raw.js';
import { interpolate, isPlainObject, outputKey } from './support.js';
const OPERATORS = new Set(['=', '<', '>', '<=', '>=', '<>', '!=', 'like', 'not like', 'ilike', 'not ilike']);
function checkOperator(operator) {
    const op = String(operator).trim().toLowerCase();
    if (!OPERATORS.has(op))
        throw new Error(`Invalid operator "${operator}". Allowed: ${[...OPERATORS].join(', ')}.`);
    return op;
}
function defined(value, label) {
    if (value === undefined)
        throw new Error(`${label}: the value is undefined (a missing request field?). Pass null explicitly if you mean NULL.`);
    return value;
}
export class Conditions {
    connection;
    wheres = [];
    constructor(connection) {
        this.connection = connection;
    }
    when(value, then, otherwise) {
        if (value)
            then(this, value);
        else
            otherwise?.(this, value);
        return this;
    }
    unless(value, then) {
        if (!value)
            then(this, value);
        return this;
    }
    where(...args) {
        return this.addWhere('and', args);
    }
    orWhere(...args) {
        return this.addWhere('or', args);
    }
    whereColumn(...args) {
        return this.addColumn('and', args);
    }
    orWhereColumn(...args) {
        return this.addColumn('or', args);
    }
    whereIn(column, values) {
        return this.addIn('and', column, values, false);
    }
    whereNotIn(column, values) {
        return this.addIn('and', column, values, true);
    }
    orWhereIn(column, values) {
        return this.addIn('or', column, values, false);
    }
    orWhereNotIn(column, values) {
        return this.addIn('or', column, values, true);
    }
    whereNull(column) {
        return this.addNull('and', column, false);
    }
    whereNotNull(column) {
        return this.addNull('and', column, true);
    }
    orWhereNull(column) {
        return this.addNull('or', column, false);
    }
    orWhereNotNull(column) {
        return this.addNull('or', column, true);
    }
    whereBetween(column, values) {
        return this.addBetween('and', column, values, false);
    }
    whereNotBetween(column, values) {
        return this.addBetween('and', column, values, true);
    }
    orWhereBetween(column, values) {
        return this.addBetween('or', column, values, false);
    }
    whereExists(query) {
        this.wheres.push({ type: 'exists', query: this.subquery(query), not: false, boolean: 'and' });
        return this;
    }
    whereNotExists(query) {
        this.wheres.push({ type: 'exists', query: this.subquery(query), not: true, boolean: 'and' });
        return this;
    }
    orWhereExists(query) {
        this.wheres.push({ type: 'exists', query: this.subquery(query), not: false, boolean: 'or' });
        return this;
    }
    whereRaw(sql, bindings = []) {
        this.wheres.push({ type: 'raw', sql, bindings, boolean: 'and' });
        return this;
    }
    orWhereRaw(sql, bindings = []) {
        this.wheres.push({ type: 'raw', sql, bindings, boolean: 'or' });
        return this;
    }
    whereDate(column, ...args) {
        return this.addDate('date', 'and', column, args);
    }
    whereDay(column, ...args) {
        return this.addDate('day', 'and', column, args);
    }
    whereMonth(column, ...args) {
        return this.addDate('month', 'and', column, args);
    }
    whereYear(column, ...args) {
        return this.addDate('year', 'and', column, args);
    }
    whereTime(column, ...args) {
        return this.addDate('time', 'and', column, args);
    }
    orWhereDate(column, ...args) {
        return this.addDate('date', 'or', column, args);
    }
    orWhereMonth(column, ...args) {
        return this.addDate('month', 'or', column, args);
    }
    orWhereYear(column, ...args) {
        return this.addDate('year', 'or', column, args);
    }
    subquery(source) {
        if (source instanceof QueryBuilder)
            return source;
        const query = new QueryBuilder(this.connection);
        source(query);
        return query;
    }
    nest(boolean, build) {
        const group = new WhereGroup(this.connection);
        build(group);
        if (group.wheres.length)
            this.wheres.push({ type: 'nested', query: group, boolean });
        return this;
    }
    addWhere(boolean, args) {
        const [column, second, third] = args;
        if (typeof column === 'function')
            return this.nest(boolean, column);
        if (args.length === 1) {
            if (!isPlainObject(column))
                throw new Error('where() needs a column, a callback or an object of column => value.');
            return this.nest(boolean, (group) => {
                for (const [key, value] of Object.entries(column))
                    group.where(key, value);
            });
        }
        if (typeof column !== 'string' && !(column instanceof Raw))
            throw new Error('where(): the column must be a string or DB.raw().');
        const operator = args.length === 2 ? '=' : checkOperator(String(second));
        const value = args.length === 2 ? second : third;
        defined(value, `where("${String(column)}")`);
        if (typeof value === 'function' || value instanceof QueryBuilder) {
            this.wheres.push({ type: 'sub', column, operator, query: this.subquery(value), boolean });
            return this;
        }
        if (value === null) {
            if (operator === '=')
                return this.addNull(boolean, column, false);
            if (operator === '<>' || operator === '!=')
                return this.addNull(boolean, column, true);
        }
        this.wheres.push({ type: 'basic', column, operator, value, boolean });
        return this;
    }
    addColumn(boolean, args) {
        const [first, a, b] = args;
        const operator = args.length === 2 ? '=' : checkOperator(String(a));
        const second = args.length === 2 ? a : b;
        this.wheres.push({ type: 'column', first: first, operator, second: second, boolean });
        return this;
    }
    addIn(boolean, column, values, not) {
        if (Array.isArray(values)) {
            values.forEach((v, i) => defined(v, `whereIn("${String(column)}")[${i}]`));
            this.wheres.push({ type: 'in', column, values, not, boolean });
        }
        else {
            this.wheres.push({ type: 'in', column, values: this.subquery(values), not, boolean });
        }
        return this;
    }
    addNull(boolean, column, not) {
        this.wheres.push({ type: 'null', column, not, boolean });
        return this;
    }
    addBetween(boolean, column, values, not) {
        this.wheres.push({
            type: 'between',
            column,
            values: [defined(values[0], 'whereBetween()'), defined(values[1], 'whereBetween()')],
            not,
            boolean,
        });
        return this;
    }
    addDate(part, boolean, column, args) {
        const operator = args.length === 1 ? '=' : checkOperator(args[0]);
        const value = args.length === 1 ? args[0] : args[1];
        this.wheres.push({ type: 'date', part, column, operator, value: defined(value, `where${part}()`), boolean });
        return this;
    }
}
export class WhereGroup extends Conditions {
}
export class JoinClause extends Conditions {
    kind;
    source;
    constructor(connection, kind, source) {
        super(connection);
        this.kind = kind;
        this.source = source;
    }
    on(...args) {
        return this.addColumn('and', args);
    }
    orOn(...args) {
        return this.addColumn('or', args);
    }
}
export class QueryBuilder extends Conditions {
    columns = [];
    isDistinct = false;
    fromSource = undefined;
    joins = [];
    groups = [];
    havings = [];
    orders = [];
    limitValue = undefined;
    offsetValue = undefined;
    unions = [];
    lockMode = undefined;
    aggregateSpec = undefined;
    get grammar() {
        return this.connection.grammar;
    }
    from(table) {
        this.fromSource = table;
        return this;
    }
    fromSub(query, alias) {
        this.fromSource = { query: this.subquery(query), alias };
        return this;
    }
    select(...columns) {
        this.columns = columns;
        return this;
    }
    addSelect(...columns) {
        this.columns.push(...columns);
        return this;
    }
    selectRaw(sql, bindings = []) {
        this.columns.push(new Raw(sql, bindings));
        return this;
    }
    selectSub(query, alias) {
        const { sql, bindings } = this.grammar.compileSelect(this.subquery(query));
        this.columns.push(new Raw(`(${sql}) as ${this.grammar.wrap(alias)}`, bindings));
        return this;
    }
    distinct() {
        this.isDistinct = true;
        return this;
    }
    join(table, ...args) {
        return this.addJoin('inner', table, args);
    }
    leftJoin(table, ...args) {
        return this.addJoin('left', table, args);
    }
    rightJoin(table, ...args) {
        return this.addJoin('right', table, args);
    }
    crossJoin(table) {
        this.joins.push(new JoinClause(this.connection, 'cross', table));
        return this;
    }
    joinSub(query, alias, ...args) {
        return this.addJoin('inner', { query: this.subquery(query), alias }, args);
    }
    leftJoinSub(query, alias, ...args) {
        return this.addJoin('left', { query: this.subquery(query), alias }, args);
    }
    addJoin(kind, source, args) {
        const join = new JoinClause(this.connection, kind, source);
        if (typeof args[0] === 'function')
            args[0](join);
        else
            join.on(...args);
        this.joins.push(join);
        return this;
    }
    groupBy(...columns) {
        this.groups.push(...columns);
        return this;
    }
    groupByRaw(sql, bindings = []) {
        this.groups.push(new Raw(sql, bindings));
        return this;
    }
    having(column, operator, value) {
        this.havings.push({ type: 'basic', column, operator: checkOperator(operator), value: defined(value, 'having()'), boolean: 'and' });
        return this;
    }
    orHaving(column, operator, value) {
        this.havings.push({ type: 'basic', column, operator: checkOperator(operator), value: defined(value, 'orHaving()'), boolean: 'or' });
        return this;
    }
    havingRaw(sql, bindings = []) {
        this.havings.push({ type: 'raw', sql, bindings, boolean: 'and' });
        return this;
    }
    orderBy(column, direction = 'asc') {
        const dir = String(direction).toLowerCase();
        if (dir !== 'asc' && dir !== 'desc')
            throw new Error(`orderBy(): direction must be "asc" or "desc", got "${direction}".`);
        this.orders.push({ type: 'column', column, direction: dir });
        return this;
    }
    orderByDesc(column) {
        return this.orderBy(column, 'desc');
    }
    latest(column = 'created_at') {
        return this.orderBy(column, 'desc');
    }
    oldest(column = 'created_at') {
        return this.orderBy(column, 'asc');
    }
    orderByRaw(sql, bindings = []) {
        this.orders.push({ type: 'raw', sql, bindings });
        return this;
    }
    inRandomOrder() {
        this.orders.push({ type: 'random' });
        return this;
    }
    reorder(column, direction = 'asc') {
        this.orders = [];
        return column === undefined ? this : this.orderBy(column, direction);
    }
    limit(count) {
        if (!Number.isInteger(count) || count < 0)
            throw new Error('limit() must be a whole number of 0 or more.');
        this.limitValue = count;
        return this;
    }
    take(count) {
        return this.limit(count);
    }
    offset(count) {
        if (!Number.isInteger(count) || count < 0)
            throw new Error('offset() must be a whole number of 0 or more.');
        this.offsetValue = count;
        return this;
    }
    skip(count) {
        return this.offset(count);
    }
    forPage(page, perPage = 15) {
        if (!Number.isInteger(page) || page < 1)
            throw new Error('page must be a whole number of 1 or more.');
        if (!Number.isInteger(perPage) || perPage < 1)
            throw new Error('perPage must be a whole number of 1 or more.');
        return this.offset((page - 1) * perPage).limit(perPage);
    }
    union(query) {
        this.unions.push({ query: this.subquery(query), all: false });
        return this;
    }
    unionAll(query) {
        this.unions.push({ query: this.subquery(query), all: true });
        return this;
    }
    lockForUpdate() {
        this.lockMode = 'update';
        return this;
    }
    sharedLock() {
        this.lockMode = 'shared';
        return this;
    }
    clone() {
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
    toSql() {
        return this.grammar.compileSelect(this).sql;
    }
    getBindings() {
        return this.grammar.compileSelect(this).bindings;
    }
    toRawSql() {
        const { sql, bindings } = this.grammar.compileSelect(this);
        return interpolate(sql, bindings);
    }
    dump() {
        console.log(this.toRawSql());
        return this;
    }
    async get(columns) {
        const query = columns && !this.columns.length ? this.clone().select(...columns) : this;
        const { sql, bindings } = this.grammar.compileSelect(query);
        return this.connection.select(sql, bindings);
    }
    async first(columns) {
        return (await this.clone().limit(1).get(columns))[0] ?? null;
    }
    async find(id, column = 'id') {
        return this.clone().where(column, id).first();
    }
    async value(column) {
        const row = await this.clone().select(column).first();
        return row ? row[outputKey(column)] : null;
    }
    async pluck(column, key) {
        const rows = await this.clone().select(...(key ? [column, key] : [column])).get();
        const valueKey = outputKey(column);
        if (!key)
            return rows.map((row) => row[valueKey]);
        const keyName = outputKey(key);
        return Object.fromEntries(rows.map((row) => [String(row[keyName]), row[valueKey]]));
    }
    async exists() {
        const { sql, bindings } = this.grammar.compileExists(this);
        const [row] = await this.connection.select(sql, bindings);
        return Boolean(Number(row?.exists ?? 0));
    }
    async doesntExist() {
        return !(await this.exists());
    }
    async count(column = '*') {
        return Number(await this.aggregate('count', column));
    }
    async sum(column) {
        return Number((await this.aggregate('sum', column)) ?? 0);
    }
    async avg(column) {
        const value = await this.aggregate('avg', column);
        return value === null || value === undefined ? null : Number(value);
    }
    async min(column) {
        return this.aggregate('min', column);
    }
    async max(column) {
        return this.aggregate('max', column);
    }
    async aggregate(fn, column) {
        let query;
        if (this.groups.length || this.havings.length || this.unions.length) {
            query = new QueryBuilder(this.connection).fromSub(this.clone(), 'aggregate_table');
        }
        else {
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
    async paginate(perPage = 15, page = 1) {
        if (!Number.isInteger(perPage) || perPage < 1)
            throw new Error('perPage must be a whole number of 1 or more.');
        if (!Number.isInteger(page) || page < 1)
            throw new Error('page must be a whole number of 1 or more.');
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
    async chunk(size, callback) {
        if (!this.orders.length)
            throw new Error('chunk() needs an orderBy() so pages are stable (or use chunkById()).');
        for (let page = 1;; page++) {
            const rows = await this.clone().forPage(page, size).get();
            if (!rows.length)
                return true;
            if ((await callback(rows, page)) === false)
                return false;
            if (rows.length < size)
                return true;
        }
    }
    async chunkById(size, callback, column = 'id') {
        const key = outputKey(column);
        let last;
        for (let page = 1;; page++) {
            const query = this.clone().reorder(column).limit(size);
            if (last !== undefined)
                query.where(column, '>', last);
            const rows = await query.get();
            if (!rows.length)
                return true;
            if ((await callback(rows, page)) === false)
                return false;
            last = rows[rows.length - 1][key];
            if (last === undefined)
                throw new Error(`chunkById(): column "${key}" is not in the result.`);
            if (rows.length < size)
                return true;
        }
    }
    requireTable() {
        if (typeof this.fromSource !== 'string')
            throw new Error('This operation needs a plain table: DB.table("users").');
        return this.fromSource;
    }
    rows(values) {
        const rows = Array.isArray(values) ? values : [values];
        const first = rows[0];
        if (!first)
            return [];
        const signature = (row) => Object.keys(row).sort().join('\u0000');
        const expected = signature(first);
        rows.forEach((row, index) => {
            if (!isPlainObject(row))
                throw new Error(`insert(): row ${index} must be a plain object.`);
            if (signature(row) !== expected)
                throw new Error(`insert(): row ${index} has different columns than the first row.`);
        });
        return rows;
    }
    async insert(values) {
        const rows = this.rows(values);
        if (!rows.length)
            return true;
        const { sql, bindings } = this.grammar.insert(this.requireTable(), rows);
        await this.connection.execute(sql, bindings);
        return true;
    }
    async insertOrIgnore(values) {
        const rows = this.rows(values);
        if (!rows.length)
            return 0;
        const { sql, bindings } = this.grammar.insert(this.requireTable(), rows, { ignore: true });
        return (await this.connection.execute(sql, bindings)).affectedRows;
    }
    async insertGetId(values, idColumn = 'id') {
        const [row] = this.rows(values);
        const { sql, bindings } = this.grammar.insert(this.requireTable(), row ? [row] : [{}], { returning: idColumn });
        const result = await this.connection.execute(sql, bindings);
        const id = result.rows[0]?.[idColumn] ?? result.insertId;
        if (id === undefined || id === null)
            throw new Error('insertGetId(): the database did not return an id.');
        return id;
    }
    async update(values) {
        if (!Object.keys(values).length)
            return 0;
        const { sql, bindings } = this.grammar.update(this, values);
        return (await this.connection.execute(sql, bindings)).affectedRows;
    }
    async updateOrInsert(attributes, values = {}) {
        const query = this.clone().where(attributes);
        if (!(await query.exists())) {
            await this.insert({ ...attributes, ...values });
            return true;
        }
        if (Object.keys(values).length)
            await query.update(values);
        return true;
    }
    async upsert(values, uniqueBy, update) {
        const rows = this.rows(values);
        if (!rows.length)
            return 0;
        if (!uniqueBy.length)
            throw new Error('upsert(): uniqueBy needs at least one column.');
        const columns = Object.keys(rows[0]);
        const updateColumns = update ?? columns.filter((column) => !uniqueBy.includes(column));
        if (!updateColumns.length)
            return this.insertOrIgnore(rows);
        const { sql, bindings } = this.grammar.upsert(this.requireTable(), rows, uniqueBy, updateColumns);
        return (await this.connection.execute(sql, bindings)).affectedRows;
    }
    increment(column, amount = 1, extra = {}) {
        return this.step(column, amount, '+', extra);
    }
    decrement(column, amount = 1, extra = {}) {
        return this.step(column, amount, '-', extra);
    }
    step(column, amount, sign, extra) {
        if (!Number.isFinite(amount))
            throw new Error('increment() / decrement(): the amount must be a number.');
        const expression = new Raw(`${this.grammar.wrap(column)} ${sign} ?`, [amount]);
        return this.update({ [column]: expression, ...extra });
    }
    async delete(id) {
        const query = id === undefined ? this : this.clone().where('id', id);
        const { sql, bindings } = this.grammar.delete(query);
        return (await this.connection.execute(sql, bindings)).affectedRows;
    }
    async truncate() {
        for (const { sql, bindings } of this.grammar.truncate(this.requireTable())) {
            await this.connection.execute(sql, bindings);
        }
    }
}
//# sourceMappingURL=Builder.js.map