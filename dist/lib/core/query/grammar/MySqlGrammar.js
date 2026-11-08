import { Grammar } from './Grammar.js';
export class MySqlGrammar extends Grammar {
    dialect = 'mysql';
    quote = '`';
    limitedWrites = true;
    dateExpr(part, column) {
        return `${part}(${column})`;
    }
    random() {
        return 'rand()';
    }
    lock(mode) {
        return mode === 'update' ? 'for update' : 'lock in share mode';
    }
    insertVerb(ignore) {
        return ignore ? 'insert ignore into' : 'insert into';
    }
    emptyInsert() {
        return '() values ()';
    }
    limitOffset(limit, offset) {
        if (limit === undefined && offset !== undefined)
            return ['limit 18446744073709551615', `offset ${offset}`];
        return super.limitOffset(limit, offset);
    }
    upsert(table, rows, _uniqueBy, update) {
        const insert = this.insert(table, rows);
        const sets = update.map((c) => `${this.segment(c)} = values(${this.segment(c)})`).join(', ');
        return { sql: `${insert.sql} on duplicate key update ${sets}`, bindings: insert.bindings };
    }
    truncate(table) {
        return [{ sql: `truncate table ${this.wrap(table)}`, bindings: [] }];
    }
}
//# sourceMappingURL=MySqlGrammar.js.map