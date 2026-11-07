import { Database } from '../../database/Database.js';
import { Schema } from '../../database/Schema.js';
import { DatabaseCommand } from '../../database/commands/DatabaseCommand.js';
import { DB } from '../DB.js';

export class QueryCheckCommand extends DatabaseCommand {
  readonly signature = 'query:check';
  readonly description = 'Run the query builder against the database (uses a temporary table)';

  async handle(): Promise<number> {
    const table = 'query_pack_check';
    const schema = new Schema(Database.connection());
    const results: Array<[string, boolean]> = [];
    const check = (label: string, ok: boolean) => results.push([label, ok]);
    const q = () => DB.table(table);

    await schema.dropIfExists(table);
    await schema.create(table, (t) => {
      t.id();
      t.string('name', 50);
      t.integer('votes').default(0);
      t.timestamps();
    });

    try {
      const id = await q().insertGetId({ name: 'ada', votes: 1 });
      check('insertGetId returns an id', Number(id) > 0);

      await q().insert([
        { name: 'bob', votes: 5 },
        { name: 'cy', votes: 9 },
      ]);
      check('multi-row insert + count', (await q().count()) === 3);
      check('where + first', Number((await q().where('name', 'bob').first())?.votes) === 5);
      check('whereIn + orderBy + pluck', JSON.stringify(await q().whereIn('name', ['ada', 'cy']).orderBy('name').pluck('name')) === '["ada","cy"]');
      check('nested orWhere', (await q().where((w) => w.where('name', 'ada').orWhere('name', 'cy')).count()) === 2);
      check('sum / max', (await q().sum('votes')) === 15 && Number(await q().max('votes')) === 9);
      check('exists / doesntExist', (await q().where('name', 'bob').exists()) && (await q().where('name', 'zed').doesntExist()));

      check('update returns affected rows', (await q().where('votes', '>', 1).update({ votes: 0 })) === 2);
      check('increment', (await q().where('name', 'ada').increment('votes', 4)) === 1 && Number(await q().where('name', 'ada').value('votes')) === 5);

      await q().upsert([{ id, name: 'ada2', votes: 7 }], ['id'], ['name', 'votes']);
      check('upsert updates in place', (await q().where('id', id).value('name')) === 'ada2' && (await q().count()) === 3);

      const page = await q().orderBy('id').paginate(2, 2);
      check('paginate', page.total === 3 && page.data.length === 1 && page.lastPage === 2);

      await DB.transaction(async (trx) => {
        await trx.table(table).where('name', 'bob').delete();
      });
      check('transaction commits', (await q().count()) === 2);

      await DB.transaction(async (trx) => {
        await trx.table(table).delete();
        throw new Error('rollback me');
      }).catch(() => undefined);
      check('transaction rolls back', (await q().count()) === 2);
    } finally {
      await schema.dropIfExists(table);
    }

    this.table(['Check', 'Result'], results.map(([label, ok]) => [label, ok ? 'ok' : 'FAILED']));
    this.newLine();

    const failed = results.filter(([, ok]) => !ok).length;
    if (failed) {
      this.error(`${failed} check${failed === 1 ? '' : 's'} failed on ${DB.connection().dialect}.`);
      return 1;
    }
    this.success(`All ${results.length} checks passed on ${DB.connection().dialect}.`);
    return 0;
  }
}
