import assert from 'node:assert/strict';
import test from 'node:test';

import { settingRules } from '../src/lib/admin/settings.js';
import { Validator } from '../src/lib/core/validation/Validator.js';

test('settings validation only exposes whitelisted keys', async () => {
  const rules = settingRules();
  assert.deepEqual(Object.keys(rules).sort(), [
    'maintenance_mode',
    'registration_enabled',
    'support_email',
  ]);

  const changes = await Validator.validate(
    { registration_enabled: false, unknown_setting: true },
    rules,
  );
  assert.deepEqual(changes, { registration_enabled: false });
});

test('settings validation accepts a blank support email to clear it', async () => {
  const changes = await Validator.validate({ support_email: '' }, settingRules());
  assert.deepEqual(changes, { support_email: '' });
});

test('settings validation rejects malformed support email and boolean values', async () => {
  await assert.rejects(
    Validator.validate({ support_email: 'not-an-email' }, settingRules()),
    /Validation failed/,
  );
  await assert.rejects(
    Validator.validate({ maintenance_mode: 'enabled' }, settingRules()),
    /Validation failed/,
  );
});
