import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Config } from '../src/lib/core/config/index.js';
import { decryptBvn, encryptBvn, hashBvn, maskBvn } from '../src/lib/kyc.js';

Config.set('app.key', 'test-kyc-encryption-key');

test('BVN is masked and encrypted data can be decrypted', () => {
  const bvn = '12345678901';
  const encrypted = encryptBvn(bvn);

  assert.equal(maskBvn(bvn), '*******8901');
  assert.notEqual(encrypted, bvn);
  assert.equal(decryptBvn(encrypted), bvn);
});

test('encrypted BVN cannot be altered without detection', () => {
  const encrypted = encryptBvn('12345678901');
  const [version, iv, tag, ciphertext] = encrypted.split(':');
  assert.ok(version && iv && tag && ciphertext);
  const changedTag = `${tag[0] === 'A' ? 'B' : 'A'}${tag.slice(1)}`;
  const altered = `${version}:${iv}:${changedTag}:${ciphertext}`;

  assert.throws(() => decryptBvn(altered));
});

test('BVN duplicate hashes are stable without retaining plaintext', () => {
  assert.equal(hashBvn('12345678901'), hashBvn('12345678901'));
  assert.notEqual(hashBvn('12345678901'), hashBvn('12345678902'));
});
