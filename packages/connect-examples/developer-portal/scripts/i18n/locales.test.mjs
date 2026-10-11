import test from 'node:test';
import assert from 'node:assert/strict';
import { localeCodes, localeFromPath, localizedPath } from '../../i18n/locales.mjs';

test('six target locales are known, and unknown language codes fall back to English', () => {
  assert.deepEqual(localeCodes, ['en', 'zh', 'fr', 'de', 'es', 'ja']);
  assert.equal(localeFromPath('/ja/hardware-sdk/'), 'ja');
  assert.equal(localeFromPath('/portal/de/hardware-sdk/', '/portal'), 'de');
  assert.equal(localeFromPath('/not-a-language/page/'), 'en');
});
test('language switching preserves base paths, slugs, query and anchor', () => {
  assert.equal(localizedPath('/portal/en/hardware-sdk/a/?x=1#params', 'de', '/portal'), '/portal/de/hardware-sdk/a/?x=1#params');
  assert.equal(localizedPath('/en/', 'ja'), '/ja/');
  assert.equal(localizedPath('https://example.com/en/docs', 'fr'), 'https://example.com/en/docs');
  assert.equal(localizedPath('/assets/en/image.svg', 'fr'), '/assets/en/image.svg');
  assert.equal(localizedPath('/english/start', 'fr'), '/english/start');
  assert.throws(() => localizedPath('/en/', 'xx'), /Unsupported/);
});
