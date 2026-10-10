import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContent } from './check-content.mjs';

const pages = { 'content/en/a.mdx': 'English', 'content/zh/a.mdx': '中文' };
const mapping = { reviewedSourcePages: 1, pages: [{ source: 'a.md', disposition: 'adapted', targets: Object.keys(pages) }] };
const review = { pages: { 'a.mdx': { en: 'English', zh: '中文' } } };
test('accepts reviewed bilingual pages and source mapping', () => {
  assert.deepEqual(validateContent(pages, review, mapping, value => value), []);
});
test('rejects a missing translation and missing migration target', () => {
  const errors = validateContent({ 'content/en/a.mdx': 'English' }, review, mapping, value => value);
  assert.ok(errors.some(error => error.includes('Missing Chinese page')));
  assert.ok(errors.some(error => error.includes('Missing migration target')));
});
test('requires review when either language changes', () => {
  for (const locale of ['en', 'zh']) {
    const errors = validateContent({ ...pages, [`content/${locale}/a.mdx`]: 'changed' }, review, mapping, value => value);
    assert.ok(errors.some(error => error.includes('Bilingual review required: a.mdx')));
  }
});
test('rejects unreviewed additions, removed pages, and duplicate source entries', () => {
  assert.ok(validateContent({ ...pages, 'content/en/b.mdx': 'New', 'content/zh/b.mdx': '新' }, review, mapping, value => value).some(error => error.includes('b.mdx')));
  assert.ok(validateContent({}, review, mapping, value => value).some(error => error.includes('Stale review entry')));
  assert.ok(validateContent(pages, review, { ...mapping, pages: [...mapping.pages, ...mapping.pages] }, value => value).some(error => error.includes('Duplicate GitBook source')));
});
