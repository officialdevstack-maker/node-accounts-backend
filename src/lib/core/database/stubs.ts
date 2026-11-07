// database/stubs.ts
// File templates for make:migration / make:model / make:seeder.

export type MigrationKind = 'create' | 'alter' | 'blank';

export function migrationStub(file: string, kind: MigrationKind, table?: string): string {
  const header = `// database/migrations/${file}.ts`;
  const imports = `import { Migration } from '../Migration.js';\nimport type { Schema } from '../Schema.js';\n`;

  if (kind === 'create') {
    return `${header}\n${imports}
export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.create('${table}', (t) => {
      t.id();
      // t.string('name');
      // t.foreignId('user_id').constrained().cascadeOnDelete();
      t.timestamps();
    });
  }

  async down(schema: Schema): Promise<void> {
    await schema.dropIfExists('${table}');
  }
}
`;
  }

  if (kind === 'alter') {
    return `${header}\n${imports}
export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    await schema.table('${table}', (t) => {
      // t.string('phone', 20).nullable();
    });
  }

  async down(schema: Schema): Promise<void> {
    // await schema.dropColumn('${table}', 'phone');
  }
}
`;
  }

  return `${header}\n${imports}
export default class extends Migration {
  async up(schema: Schema): Promise<void> {
    //
  }

  async down(schema: Schema): Promise<void> {
    //
  }
}
`;
}

export function seederStub(cls: string): string {
  return `// database/seeders/${cls}.ts
import { Seeder } from '../Seeder.js';

export class ${cls} extends Seeder {
  async run(): Promise<void> {
    // await User.bulkCreate([{ name: 'Ada' }]);
    // await this.call(OtherSeeder);
  }
}
`;
}

export function modelStub(cls: string, table: string): string {
  return `// database/models/${cls}.ts
// Loaded automatically by Database.boot(): it calls init${cls}(sequelize) for every file in database/models/.
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
  type Sequelize,
} from 'sequelize';

export class ${cls} extends Model<InferAttributes<${cls}>, InferCreationAttributes<${cls}>> {
  declare id: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Called once every model exists. Define relations here: this.hasMany(models.Wallet!) */
  static associate(_models: Record<string, ModelStatic<Model>>): void {
    //
  }
}

export function init${cls}(sequelize: Sequelize) {
  ${cls}.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: '${table}', underscored: true, timestamps: true },
  );

  return ${cls};
}
`;
}
