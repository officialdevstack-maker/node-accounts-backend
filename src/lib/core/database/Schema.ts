// database/Schema.ts
// What a migration receives. A thin Laravel-style layer over Sequelize's QueryInterface.
//
//   await schema.create('wallets', (t) => { t.id(); t.foreignId('user_id').constrained().cascadeOnDelete(); t.timestamps(); });
//   await schema.table('wallets', (t) => { t.string('currency', 3).default('NGN'); });
//   await schema.dropIfExists('wallets');
//
// Need something this doesn't cover?  schema.queryInterface  or  schema.raw('...')  are always there.
import type { QueryInterface, Sequelize } from 'sequelize';
import { Blueprint } from './Blueprint.js';

export class Schema {
  constructor(readonly sequelize: Sequelize) {}

  get queryInterface(): QueryInterface {
    return this.sequelize.getQueryInterface();
  }

  /** CREATE TABLE */
  async create(table: string, build: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table);
    build(blueprint);

    if (!blueprint.columns.length) throw new Error(`Cannot create table "${table}" without any columns.`);

    const attributes = Object.fromEntries(blueprint.columns.map((c) => [c.name, c.definition]));
    await this.queryInterface.createTable(table, attributes as Parameters<QueryInterface['createTable']>[1]);
    await this.applyIndexes(blueprint);
  }

  /** ALTER TABLE ... ADD COLUMN for every column in the blueprint (plus any indexes). */
  async table(table: string, build: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table);
    build(blueprint);

    for (const column of blueprint.columns) {
      await this.queryInterface.addColumn(table, column.name, column.definition);
    }
    await this.applyIndexes(blueprint);
  }

  /** DROP TABLE IF EXISTS */
  async drop(table: string): Promise<void> {
    await this.queryInterface.dropTable(table);
  }

  async dropIfExists(table: string): Promise<void> {
    await this.drop(table);
  }

  async rename(from: string, to: string): Promise<void> {
    await this.queryInterface.renameTable(from, to);
  }

  async dropColumn(table: string, column: string): Promise<void> {
    await this.queryInterface.removeColumn(table, column);
  }

  async renameColumn(table: string, from: string, to: string): Promise<void> {
    await this.queryInterface.renameColumn(table, from, to);
  }

  async dropIndex(table: string, nameOrFields: string | string[]): Promise<void> {
    await this.queryInterface.removeIndex(table, nameOrFields as never);
  }

  async hasTable(table: string): Promise<boolean> {
    const tables = (await this.queryInterface.showAllTables()) as unknown[];
    const names = tables.map((t) => (typeof t === 'string' ? t : String((t as { tableName?: string }).tableName ?? '')));
    return names.includes(table);
  }

  async hasColumn(table: string, column: string): Promise<boolean> {
    try {
      return column in (await this.queryInterface.describeTable(table));
    } catch {
      return false; // describeTable throws when the table doesn't exist
    }
  }

  /** Run a raw SQL statement. */
  async raw(sql: string): Promise<void> {
    await this.sequelize.query(sql);
  }

  private async applyIndexes(blueprint: Blueprint): Promise<void> {
    for (const index of blueprint.indexes) {
      await this.queryInterface.addIndex(blueprint.table, index.fields, {
        unique: index.unique,
        ...(index.name ? { name: index.name } : {}),
      });
    }
  }
}
