// database/Seeder.ts
// Base class for files in database/seeders/. Generate one with:  artisan make:seeder UserSeeder
import { pathToFileURL } from 'node:url';
import { Database } from './Database.js';
import { databasePath } from './paths.js';
export class Seeder {
    /** The shared connection, for queries that don't go through a model. */
    get db() {
        return Database.connection();
    }
    /** Run other seeders from this one: await this.call(UserSeeder, WalletSeeder) */
    async call(...seeders) {
        for (const Class of seeders)
            await new Class().run();
    }
}
/**
 * Load database/seeders/<name>.ts and return the class it exports (named export `<name>` or the default export).
 * Convention: the file is named after the class.
 */
export async function loadSeeder(name) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name))
        throw new Error(`"${name}" is not a valid seeder class name.`);
    const file = databasePath('seeders', `${name}.ts`);
    let module;
    try {
        module = (await import(pathToFileURL(file).href));
    }
    catch (error) {
        const code = error.code;
        if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
            throw new Error(`Seeder "${name}" not found (looked for database/seeders/${name}.ts).`);
        }
        throw error;
    }
    const Class = module[name] ?? module.default;
    if (typeof Class !== 'function' || !(Class.prototype instanceof Seeder)) {
        throw new Error(`database/seeders/${name}.ts must export a class "${name}" that extends Seeder.`);
    }
    return Class;
}
//# sourceMappingURL=Seeder.js.map