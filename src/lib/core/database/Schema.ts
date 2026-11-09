import type { Connection } from '../query/Connection.js';
import { Blueprint } from './Blueprint.js';
import { quoteId } from './support.js';

export class Schema {
  constructor(readonly connection: Connection) {}

  private get pg(): boolean {
    return this.connection.dialect === 'pgsql';
  }

  private ident(name: string): string {
    return this.pg ? `"${name.replaceAll('"', '""')}"` : quoteId(name);
  }

  private get currentDb(): string {
    return this.pg ? 'current_schema()' : 'database()';
  }

  /** CREATE TABLE */
  async create(table: string, build: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table);
    build(blueprint);
    if (!blueprint.columns.length) throw new Error(`Cannot create table "${table}" without any columns.`);

    for (const sql of blueprint.createStatements()) await this.raw(sql);
  }

  /** ALTER TABLE ... ADD COLUMN for every column in the blueprint (plus indexes and foreign keys). */
  async table(table: string, build: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table);
    build(blueprint);
    for (const sql of blueprint.alterSql()) await this.raw(sql);
  }

  async drop(table: string): Promise<void> {
    await this.raw(`DROP TABLE ${this.ident(table)}`);
  }

  async dropIfExists(table: string): Promise<void> {
    await this.raw(`DROP TABLE IF EXISTS ${this.ident(table)}${this.pg ? ' CASCADE' : ''}`);
  }

  /** DROP every table in the database. */
  async dropAllTables(): Promise<void> {
    if (this.pg) {
      const rows = await this.connection.select(
        'select tablename as name from pg_tables where schemaname = current_schema()',
      );
      for (const row of rows) {
        await this.raw(`DROP TABLE IF EXISTS ${this.ident(String(row.name))} CASCADE`);
      }
      return;
    }

    const rows = await this.connection.select(
      'select table_name as name from information_schema.tables where table_schema = database() and table_type = ?',
      ['BASE TABLE'],
    );

    // SET FOREIGN_KEY_CHECKS is per physical connection, so run everything on one.
    await this.connection.session(async (c) => {
      await c.statement('SET FOREIGN_KEY_CHECKS = 0');
      try {
        for (const row of rows) await c.statement(`DROP TABLE IF EXISTS ${quoteId(String(row.name))}`);
      } finally {
        await c.statement('SET FOREIGN_KEY_CHECKS = 1');
      }
    });
  }

  async rename(from: string, to: string): Promise<void> {
    await this.raw(
      this.pg
        ? `ALTER TABLE ${this.ident(from)} RENAME TO ${this.ident(to)}`
        : `RENAME TABLE ${this.ident(from)} TO ${this.ident(to)}`,
    );
  }

  async dropColumn(table: string, column: string): Promise<void> {
    await this.raw(`ALTER TABLE ${this.ident(table)} DROP COLUMN ${this.ident(column)}`);
  }

  async dropForeign(table: string, columnOrConstraintName: string): Promise<void> {
    const name = columnOrConstraintName.endsWith('_foreign')
      ? columnOrConstraintName
      : `${table}_${columnOrConstraintName}_foreign`;
    await this.raw(
      `ALTER TABLE ${this.ident(table)} DROP ${this.pg ? 'CONSTRAINT' : 'FOREIGN KEY'} ${this.ident(name)}`,
    );
  }

  async renameColumn(table: string, from: string, to: string): Promise<void> {
    await this.raw(`ALTER TABLE ${this.ident(table)} RENAME COLUMN ${this.ident(from)} TO ${this.ident(to)}`);
  }

  async dropUnique(table: string, name: string): Promise<void> {
    await this.dropIndex(table, name);
  }

  /** Pass the index name, or the column list for an index created without a custom name. */
  async dropIndex(table: string, nameOrFields: string | string[]): Promise<void> {
    if (this.pg) {
      let name: string;
      if (Array.isArray(nameOrFields)) {
        const row = await this.connection.selectOne(
          `select index_class.relname as name
           from pg_class table_class
           join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
           join pg_index index_data on index_data.indrelid = table_class.oid
           join pg_class index_class on index_class.oid = index_data.indexrelid
           where table_schema.nspname = current_schema()
             and table_class.relname = ?
             and (
               select array_agg(attribute.attname order by key.ordinality)
               from unnest(index_data.indkey) with ordinality as key(attnum, ordinality)
               join pg_attribute attribute on attribute.attrelid = table_class.oid and attribute.attnum = key.attnum
               where key.ordinality <= index_data.indnkeyatts
             ) = ?::text[]
           limit 1`,
          [table, nameOrFields],
        );
        if (!row) throw new Error(`Index on ${table} (${nameOrFields.join(', ')}) was not found.`);
        name = String(row.name);
      } else {
        name = nameOrFields;
      }
      await this.raw(`ALTER TABLE ${this.ident(table)} DROP CONSTRAINT IF EXISTS ${this.ident(name)}`);
      await this.raw(`DROP INDEX IF EXISTS ${this.ident(name)}`);
      return;
    }

    let name: string;
    if (Array.isArray(nameOrFields)) {
      const row = await this.connection.selectOne(
        "select index_name as name from information_schema.statistics where table_schema = database() and table_name = ? and index_name <> 'PRIMARY' group by index_name having group_concat(column_name order by seq_in_index separator ',') = ? limit 1",
        [table, nameOrFields.join(',')],
      );
      if (!row) throw new Error(`Index on ${table} (${nameOrFields.join(', ')}) was not found.`);
      name = String(row.name);
    } else {
      name = nameOrFields;
    }
    await this.raw(`DROP INDEX ${quoteId(name)} ON ${quoteId(table)}`);
  }

  async hasTable(table: string): Promise<boolean> {
    const row = await this.connection.selectOne(
      `select 1 as ok from information_schema.tables where table_schema = ${this.currentDb} and table_name = ? limit 1`,
      [table],
    );
    return row !== null;
  }

  async hasColumn(table: string, column: string): Promise<boolean> {
    const row = await this.connection.selectOne(
      `select 1 as ok from information_schema.columns where table_schema = ${this.currentDb} and table_name = ? and column_name = ? limit 1`,
      [table, column],
    );
    return row !== null;
  }

  /** Run a raw SQL statement. */
  async raw(sql: string): Promise<void> {
    await this.connection.statement(sql);
  }
}
