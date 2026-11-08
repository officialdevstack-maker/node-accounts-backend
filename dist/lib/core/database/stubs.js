// database/stubs.ts
// File templates for make:migration / make:seeder.
export function migrationStub(file, kind, table) {
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
export function seederStub(cls) {
    return `// database/seeders/${cls}.ts
import { Seeder } from '../Seeder.js';

export class ${cls} extends Seeder {
  async run(): Promise<void> {
    // await this.db.table('users').insert([{ fullname: 'Ada Obi' }]);
    // await this.call(OtherSeeder);
  }
}
`;
}
//# sourceMappingURL=stubs.js.map