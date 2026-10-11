import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchQuery } from '../components/docsSearch.mjs';

test('CJK indexes match the segments of underscore-delimited API identifiers', () => {
  for (const locale of ['ja', 'zh']) {
    assert.equal(normalizeSearchQuery(' ONEKEY_WEBUSB_FILTER ', locale), 'ONEKEY WEBUSB FILTER');
    assert.equal(normalizeSearchQuery('wallet_getPermissions', locale), 'wallet getPermissions');
    assert.equal(normalizeSearchQuery('evmSignTransaction', locale), 'evmSignTransaction');
  }
  for (const locale of ['en', 'fr', 'de', 'es']) {
    assert.equal(normalizeSearchQuery(' ONEKEY_WEBUSB_FILTER ', locale), 'ONEKEY_WEBUSB_FILTER');
  }
  assert.equal(normalizeSearchQuery('デバイスの接続', 'ja'), 'デバイスの接続');
});
