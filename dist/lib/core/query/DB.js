import { Database } from '../database/Database.js';
import { Connection } from './Connection.js';
import { Raw } from './Raw.js';
export class DB {
    static custom;
    static useConnection(connection) {
        this.custom = connection;
    }
    static connection() {
        return this.custom ?? Database.connection();
    }
    static table(name) {
        return this.connection().table(name);
    }
    static query() {
        return this.connection().query();
    }
    static raw(sql, bindings = []) {
        return new Raw(sql, bindings);
    }
    static select(sql, bindings = []) {
        return this.connection().select(sql, bindings);
    }
    static selectOne(sql, bindings = []) {
        return this.connection().selectOne(sql, bindings);
    }
    static insert(sql, bindings = []) {
        return this.connection().insert(sql, bindings);
    }
    static update(sql, bindings = []) {
        return this.connection().update(sql, bindings);
    }
    static delete(sql, bindings = []) {
        return this.connection().delete(sql, bindings);
    }
    static statement(sql, bindings = []) {
        return this.connection().statement(sql, bindings);
    }
    static transaction(callback) {
        return this.connection().transaction(callback);
    }
    static listen(listener) {
        Connection.listeners.push(listener);
        return () => {
            const index = Connection.listeners.indexOf(listener);
            if (index !== -1)
                Connection.listeners.splice(index, 1);
        };
    }
}
//# sourceMappingURL=DB.js.map