import type { Connection } from '../query/Connection.js';
export type SeederClass = new () => Seeder;
export declare abstract class Seeder {
    abstract run(): Promise<void> | void;
    /** The shared connection, for queries that don't go through a model. */
    protected get db(): Connection;
    /** Run other seeders from this one: await this.call(UserSeeder, WalletSeeder) */
    protected call(...seeders: SeederClass[]): Promise<void>;
}
/**
 * Load database/seeders/<name>.ts and return the class it exports (named export `<name>` or the default export).
 * Convention: the file is named after the class.
 */
export declare function loadSeeder(name: string): Promise<SeederClass>;
//# sourceMappingURL=Seeder.d.ts.map