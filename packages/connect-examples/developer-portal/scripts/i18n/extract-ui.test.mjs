import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractUI } from './extract-ui.mjs';

test('extracting new English UI copy never mutates Chinese targets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-ui-'));
  try {
    for (const dir of ['app', 'components', 'i18n/ui']) await mkdir(join(root, dir), { recursive: true });
    await writeFile(join(root, 'i18n/ui/en.json'), '{}\n');
    const original = '{"Reviewed":"已审核"}\n';
    await writeFile(join(root, 'i18n/ui/zh.json'), original);
    await writeFile(join(root, 'components/Test.jsx'), "ui('zh', 'New message', '新消息'); ui('zh', 'Reviewed', '更改');");
    await extractUI(root);
    assert.equal(await readFile(join(root, 'i18n/ui/zh.json'), 'utf8'), original);
    assert.equal(JSON.parse(await readFile(join(root, 'i18n/ui/en.json'), 'utf8'))['New message'], 'New message');
  } finally { await rm(root, { recursive: true, force: true }); }
});
