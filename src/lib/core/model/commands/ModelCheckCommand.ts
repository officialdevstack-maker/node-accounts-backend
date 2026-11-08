import { inspect } from 'node:util';
import { DatabaseCommand } from '../../database/commands/DatabaseCommand.js';
import { Database } from '../../database/Database.js';
import { Schema } from '../../database/Schema.js';
import { DB } from '../../query/DB.js';
import Validator from '../../validation/Validator.js';
import { Model } from '../Model.js';
import { castGet, castSet } from '../casts.js';

class CollisionCheckModel extends Model {
  static table = 'collision_checks';
  static fillable = ['*'];

  declare meta: { theme: string };
  declare email: string;
}

class ColumnsCheckModel extends Model {
  static columns = { address2: 'address_2' };
}

class AssignmentCastCheckModel extends Model {
  static fillable = ['*'];
  static casts = { active: 'boolean', amount: 'decimal:2' } as const;

  declare active: boolean;
  declare amount: string;
}

class HiddenCheckModel extends Model {
  static table = 'model_pack_hidden_check';
  static hidden = ['password'];
  static fillable = ['email', 'password'];
  static timestamps = false;
  static transactional = true;
  static casts = { id: 'int' } as const;

  declare id: number;
  declare email: string;
  declare password: string;
}

class AtomicCheckModel extends Model {
  static table = 'model_pack_hidden_check';
  static fillable = ['*'];
  static timestamps = false;
  static transactional = true;
  static versionColumn = 'version';
  static casts = { id: 'int', version: 'int', views: 'int' } as const;

  declare id: number;
  declare email: string;
  declare password: string;
  declare version: number;
  declare views: number;
}

class CancelSavingModel extends AtomicCheckModel {
  protected saving(): boolean { return false; }
}

class CancelCreatingModel extends AtomicCheckModel {
  protected creating(): boolean { return false; }
}

class CancelUpdatingModel extends AtomicCheckModel {
  protected updating(): boolean { return false; }
}

class CancelDeletingModel extends AtomicCheckModel {
  protected deleting(): boolean { return false; }
}

export class ModelCheckCommand extends DatabaseCommand {
  readonly signature = 'model:check';
  readonly description = 'Run model pack checks';

  async handle(): Promise<number> {
    const results: Array<[string, boolean]> = [];
    const check = (label: string, ok: boolean) => results.push([label, ok]);
    const colliding = new CollisionCheckModel();
    let hydrateRejected = false;
    let fillRejected = false;

    try {
      colliding.$hydrate({ id: 1, save: 'column' });
    } catch (error) {
      hydrateRejected = error instanceof Error && error.message.includes('collides with a model method');
    }

    try {
      colliding.fill({ email: 'ada@example.com', save: 'column' });
    } catch (error) {
      fillRejected = error instanceof Error && error.message.includes('collides with a model method');
    }

    check('hydration rejects model-member columns', hydrateRejected);
    check('fill rejects model-member attributes', fillRejected);

    const nested = new CollisionCheckModel().$hydrate({
      id: 1,
      meta: { theme: 'light' },
    });
    nested.meta.theme = 'dark';
    check('nested attribute mutations are dirty', nested.isDirty('meta'));
    check('last-save changes begin empty', !nested.wasChanged() && Object.keys(nested.getChanges()).length === 0);

    let nonReversibleRejected = false;
    try {
      CollisionCheckModel.attributeFor('address_2');
    } catch (error) {
      nonReversibleRejected = error instanceof Error && error.message.includes('static columns');
    }
    check('non-reversible columns require an override', nonReversibleRejected);
    check('column overrides round-trip', ColumnsCheckModel.attributeFor('address_2') === 'address2' && ColumnsCheckModel.columnFor('address2') === 'address_2');

    const customCast = {
      get: (value: unknown) => String(value).toUpperCase(),
      set: (value: unknown) => String(value).toLowerCase(),
    };
    check('int cast', castGet('int', '12') === 12);
    check('integer alias cast', castGet('integer', '12') === 12);
    check('float cast', castGet('float', '1.25') === 1.25);
    check('boolean cast', castGet('boolean', 1) === true && castSet('boolean', true) === 1);
    check('string cast', castGet('string', 12) === '12');
    check('json cast', JSON.stringify(castGet('json', '{"a":1}')) === '{"a":1}' && castSet('json', { a: 1 }) === '{"a":1}');
    check('date cast', castGet('date', '2020-01-01') instanceof Date);
    check('decimal cast preserves strings', castGet('decimal', '12.30') === '12.30' && castSet('decimal', '12.30') === '12.30');
    check('decimal precision uses exact string rounding', castGet('decimal:2', '999999999999999999.995') === '1000000000000000000.00');
    check('custom cast', castGet(customCast, 'ADA') === 'ADA' && castSet(customCast, 'ADA') === 'ada');

    const assignmentCasts = new AssignmentCastCheckModel();
    Reflect.set(assignmentCasts, 'active', 1);
    assignmentCasts.fill({ amount: '1.2' });
    check('proxy assignment applies casts', assignmentCasts.active === true);
    check('fill applies casts', assignmentCasts.amount === '1.20');

    const objectModel = new CollisionCheckModel().$hydrate({ email: 'ada@example.com' });
    const spreadModel = { ...objectModel };
    const validated = await Validator.validate(objectModel, { email: 'required|email' });
    check('attributes support in, keys, spread and hasOwnProperty', 'email' in objectModel
      && Object.keys(objectModel).includes('email')
      && spreadModel.email === 'ada@example.com'
      && Object.prototype.hasOwnProperty.call(objectModel, 'email'));
    check('model internals are non-enumerable', !Object.keys(objectModel).some((key) => key.startsWith('$')));
    check('validator accepts model instances', validated.email === 'ada@example.com');
    check('custom inspection prints model attributes', inspect(objectModel).includes("CollisionCheckModel { email: 'ada@example.com' }"));
    Reflect.deleteProperty(objectModel, 'email');
    check('delete removes an attribute', !('email' in objectModel) && !Object.keys(objectModel).includes('email'));

    const hiddenTable = HiddenCheckModel.table;
    const schema = new Schema(Database.connection());
    await schema.dropIfExists(hiddenTable);
    await schema.create(hiddenTable, (table) => {
      table.id();
      table.string('email', 100);
      table.string('password', 100);
      table.integer('version').default(1);
      table.integer('views').default(0);
    });
    try {
      const id = await DB.table(hiddenTable).insertGetId({
        email: 'ada@example.com',
        password: 'stored-hash',
      });
      const ordinary = await HiddenCheckModel.find(id);
      const ordinaryOutput = ordinary ? inspect(ordinary) : '';
      check('Model.find omits hidden columns from all object output', ordinary !== null
        && !Reflect.has(ordinary, 'password')
        && !Object.keys(ordinary).includes('password')
        && !Object.prototype.hasOwnProperty.call(ordinary.toObject(), 'password')
        && !JSON.stringify(ordinary).includes('password')
        && !ordinaryOutput.includes('stored-hash'));

      let hiddenReadRejected = false;
      try {
        ordinary?.getHidden('password');
      } catch {
        hiddenReadRejected = true;
      }
      check('getHidden requires withHidden', hiddenReadRejected);

      const withHidden = await HiddenCheckModel.query().withHidden().find(id);
      check('withHidden retains secret outside enumerable attributes', withHidden?.getHidden('password') === 'stored-hash'
        && !Object.keys(withHidden).includes('password')
        && !JSON.stringify(withHidden).includes('stored-hash'));

      if (ordinary) {
        ordinary.password = 'new-hash';
        check('assigned hidden attributes remain dirty', ordinary.isDirty('password'));
      } else {
        check('assigned hidden attributes remain dirty', false);
      }

      let rolledBack = false;
      try {
        await DB.transaction(async () => {
          await HiddenCheckModel.create({ email: 'rollback@example.com', password: 'rollback-hash' });
          throw new Error('rollback model transaction');
        });
      } catch (error) {
        rolledBack = error instanceof Error && error.message === 'rollback model transaction';
      }
      check('model writes inside DB.transaction roll back', rolledBack
        && (await DB.table(hiddenTable).where('email', 'rollback@example.com').count()) === 0);

      await DB.transaction(async () => {
        await HiddenCheckModel.create({ email: 'commit@example.com', password: 'commit-hash' });
      });
      check('model writes inside DB.transaction commit', (await DB.table(hiddenTable).where('email', 'commit@example.com').count()) === 1);

      const atomic = await AtomicCheckModel.create({
        email: 'atomic@example.com',
        password: 'atomic-hash',
        version: 1,
        views: 0,
      });
      await atomic.increment('views', 2, { email: 'atomic-updated@example.com' });
      check('instance increment refreshes attributes and original', atomic.views === 2
        && atomic.email === 'atomic-updated@example.com'
        && !atomic.isDirty('email'));
      await atomic.decrement('views');
      check('instance decrement refreshes attributes', atomic.views === 1 && !atomic.isDirty('views'));

      const queryIncremented = await AtomicCheckModel.where('email', 'atomic-updated@example.com').increment('views', 3);
      check('model query increment returns affected rows and updates', queryIncremented === 1
        && Number(await DB.table(hiddenTable).where('id', atomic.id).value('views')) === 4);

      const locked = await DB.transaction(async (trx) => AtomicCheckModel.query()
        .using(trx)
        .where('id', atomic.id)
        .lockForUpdate()
        .findOrFail(atomic.id));
      check('lockForUpdate works for transactional queries', locked.id === atomic.id);

      const current = await AtomicCheckModel.findOrFail(atomic.id);
      const stale = await AtomicCheckModel.findOrFail(atomic.id);
      current.email = 'version-updated@example.com';
      await current.save();
      stale.email = 'version-stale@example.com';
      let conflict = false;
      try {
        await stale.save();
      } catch (error) {
        conflict = error instanceof Error
          && 'status' in error
          && error.status === 409
          && error.message === 'The record was changed by someone else. Reload and try again.';
      }
      check('optimistic version conflicts return HTTP 409', conflict
        && (await DB.table(hiddenTable).where('id', atomic.id).value('email')) === 'version-updated@example.com');

      const cancelledSaving = new CancelSavingModel();
      cancelledSaving.fill({ email: 'cancel-saving@example.com', version: 1, views: 0 });
      await cancelledSaving.save();
      const cancelledCreating = new CancelCreatingModel();
      cancelledCreating.fill({ email: 'cancel-creating@example.com', version: 1, views: 0 });
      await cancelledCreating.save();
      check('saving and creating hooks cancel writes', !cancelledSaving.$exists
        && !cancelledCreating.$exists
        && (await DB.table(hiddenTable).whereIn('email', ['cancel-saving@example.com', 'cancel-creating@example.com']).count()) === 0);

      const cancelledUpdate = await CancelUpdatingModel.findOrFail(atomic.id);
      cancelledUpdate.email = 'cancel-update@example.com';
      await cancelledUpdate.save();
      const cancelledDelete = await CancelDeletingModel.findOrFail(atomic.id);
      const deleteResult = await cancelledDelete.delete();
      check('updating and deleting hooks cancel writes', cancelledUpdate.email !== 'cancel-update@example.com'
        && deleteResult === false
        && (await DB.table(hiddenTable).where('id', atomic.id).exists()));
    } finally {
      await schema.dropIfExists(hiddenTable);
    }

    this.table(['Check', 'Result'], results.map(([label, ok]) => [label, ok ? 'ok' : 'FAILED']));
    this.newLine();

    const failed = results.filter(([, ok]) => !ok).length;
    if (failed) {
      this.error(`${failed} check${failed === 1 ? '' : 's'} failed.`);
      return 1;
    }
    this.success(`All ${results.length} model checks passed.`);
    return 0;
  }
}
