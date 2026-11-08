import { inspect } from 'node:util';
import { DatabaseCommand } from '../../database/commands/DatabaseCommand.js';
import Validator from '../../validation/Validator.js';
import { Model } from '../Model.js';
import { castGet, castSet } from '../casts.js';

class CollisionCheckModel extends Model {
  static table = 'collision_checks';
  static fillable = ['*'];

  declare meta: { theme: string };
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
    delete objectModel.email;
    check('delete removes an attribute', !('email' in objectModel) && !Object.keys(objectModel).includes('email'));

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
