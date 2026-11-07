import { Database } from '../database/Database.js';
import type { QueryBuilder } from './Builder.js';
import { Connection } from './Connection.js';
import { Raw } from './Raw.js';
import type { QueryEvent, Row } from './types.js';

export class DB {
  private static custom?: Connection;

  static useConnection(connection: Connection): void {
    this.custom = connection;
  }

  static connection(): Connection {
    return this.custom ?? Database.connection();
  }

  static table(name: string | Raw): QueryBuilder {
    return this.connection().table(name);
  }

  static query(): QueryBuilder {
    return this.connection().query();
  }

  static raw(sql: string, bindings: readonly unknown[] = []): Raw {
    return new Raw(sql, bindings);
  }

  static select(sql: string, bindings: readonly unknown[] = []): Promise<Row[]> {
    return this.connection().select(sql, bindings);
  }

  static selectOne(sql: string, bindings: readonly unknown[] = []): Promise<Row | null> {
    return this.connection().selectOne(sql, bindings);
  }

  static insert(sql: string, bindings: readonly unknown[] = []): Promise<boolean> {
    return this.connection().insert(sql, bindings);
  }

  static update(sql: string, bindings: readonly unknown[] = []): Promise<number> {
    return this.connection().update(sql, bindings);
  }

  static delete(sql: string, bindings: readonly unknown[] = []): Promise<number> {
    return this.connection().delete(sql, bindings);
  }

  static statement(sql: string, bindings: readonly unknown[] = []): Promise<void> {
    return this.connection().statement(sql, bindings);
  }

  static transaction<T>(callback: (trx: Connection) => Promise<T>): Promise<T> {
    return this.connection().transaction(callback);
  }

  static listen(listener: (event: QueryEvent) => void): () => void {
    Connection.listeners.push(listener);
    return () => {
      const index = Connection.listeners.indexOf(listener);
      if (index !== -1) Connection.listeners.splice(index, 1);
    };
  }
}
