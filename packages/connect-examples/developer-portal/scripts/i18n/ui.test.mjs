import test from 'node:test';
import assert from 'node:assert/strict';
import {ui, translateCopy} from '../../i18n/ui.mjs';

test('reviewed or synchronized catalog values take precedence over legacy Chinese fallbacks', () => {
  assert.equal(ui('zh', 'Search', 'outdated fallback'), '搜索');
  assert.equal(ui('zh', 'Uncatalogued source', '旧文案'), '旧文案');
  assert.equal(ui('en', 'Search', '搜索'), 'Search');
});

test('dictionary translation retains technical values without a UI message entry', () => {
  assert.deepEqual(translateCopy('zh', {label:'Search', href:'/en/api', method:'evmSignTransaction', limit:3}), {label:'搜索', href:'/en/api', method:'evmSignTransaction', limit:3});
});
