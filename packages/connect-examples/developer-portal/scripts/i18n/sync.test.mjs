import test from 'node:test';
import assert from 'node:assert/strict';
import { missingUnits, partitionUnits, validateCatalogEntry } from './sync.mjs';
const units = [{ id: 'a', text: 'Connect a device' }, { id: 'b', text: 'Confirm an address' }];

test('translation memory reuses unchanged strings and requests changed strings only', () => {
  const catalog = { a: { source: 'Connect a device', translation: 'Connectez un appareil' } };
  assert.deepEqual(missingUnits(units, catalog), [units[1]]);
  assert.deepEqual(missingUnits([...units, units[1]], catalog), [units[1]]);
  assert.equal(missingUnits([{ id: 'a', text: 'Disconnect a device' }], catalog).length, 1);
});

test('empty and malformed catalog entries cannot count as translated', () => {
  assert.equal(validateCatalogEntry(units[0], { source: units[0].text, translation: '' }), false);
  assert.equal(validateCatalogEntry(units[0], { source: units[0].text, translation: [] }), false);
});

test('request batches have a bounded size and retain every unit', () => {
  const batches = partitionUnits(units, 25);
  assert.equal(batches.length, 2);
  assert.deepEqual(batches.flat(), units);
  assert.throws(() => partitionUnits([{ id: 'x', text: 'x'.repeat(50000) }]), /too large/);
});

import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sync } from './sync.mjs';

test('a completed sync is idempotent, updates changed source only, and protects manual edits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-test-'));
  try {
    await mkdir(join(root, 'content/en'), { recursive: true });
    await writeFile(join(root, 'content/en/a.mdx'), '# Connect a device\n\nRead the guide.\n');
    let requests = 0;
    const translate = async batch => { requests++; return Object.fromEntries(batch.map(unit => [unit.id, `Traduit ${unit.text}`])); };
    await sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate });
    const first = await readFile(join(root, 'content/fr/a.mdx'), 'utf8');
    assert.match(first, /Traduit Connect a device/);
    await sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate });
    assert.equal(requests, 1);
    await writeFile(join(root, 'content/en/a.mdx'), '# Connect a device\n\nVerify the address.\n');
    const requested = [];
    await sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate: async batch => { requested.push(...batch.map(unit => unit.text)); return translate(batch); } });
    assert.deepEqual(requested, ['Verify the address.']);
    await writeFile(join(root, 'content/fr/a.mdx'), 'Manual translated edit\n');
    await assert.rejects(sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate }), /Manual target edit/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('provider failure leaves target content untouched', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-failure-'));
  try {
    await mkdir(join(root, 'content/en'), { recursive: true });
    await writeFile(join(root, 'content/en/a.mdx'), '# Guide\n\nRead the guide.\n');
    await assert.rejects(sync({ root, locales: ['ja'], write: true, maxRequests: 5, translate: async () => { throw new Error('unavailable'); } }), /unavailable/);
    await assert.rejects(readFile(join(root, 'content/ja/a.mdx')), { code: 'ENOENT' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('renamed English pages remove only their recorded generated target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-rename-'));
  try {
    await mkdir(join(root, 'content/en'), { recursive: true });
    await writeFile(join(root, 'content/en/a.mdx'), '# Guide\n');
    const translate = async batch => Object.fromEntries(batch.map(unit => [unit.id, `Traduit ${unit.text}`]));
    await sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate });
    const { rename } = await import('node:fs/promises');
    await rename(join(root, 'content/en/a.mdx'), join(root, 'content/en/b.mdx'));
    await sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate });
    await assert.rejects(readFile(join(root, 'content/fr/a.mdx')), { code: 'ENOENT' });
    assert.match(await readFile(join(root, 'content/fr/b.mdx'), 'utf8'), /Traduit Guide/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('deletion conflicts are detected before requests or writes to other targets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-delete-'));
  try {
    await mkdir(join(root, 'content/en'), { recursive: true });
    for (const name of ['a', 'b']) await writeFile(join(root, `content/en/${name}.mdx`), '# Guide\n');
    const translate = async batch => Object.fromEntries(batch.map(unit => [unit.id, `Traduit ${unit.text}`]));
    await sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate });
    const before = await readFile(join(root, 'content/fr/a.mdx'), 'utf8');
    await writeFile(join(root, 'content/en/a.mdx'), '# Updated guide\n');
    await rm(join(root, 'content/en/b.mdx'));
    await writeFile(join(root, 'content/fr/b.mdx'), 'Manual edit\n');
    let called = false;
    await assert.rejects(sync({ root, locales: ['fr'], write: true, maxRequests: 5, translate: async batch => { called = true; return translate(batch); } }), /Refusing to remove/);
    assert.equal(called, false);
    assert.equal(await readFile(join(root, 'content/fr/a.mdx'), 'utf8'), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unrecorded existing targets cannot be overwritten', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-existing-'));
  try {
    for (const locale of ['en', 'fr']) await mkdir(join(root, `content/${locale}`), { recursive: true });
    await writeFile(join(root, 'content/en/a.mdx'), '# Guide\n');
    await writeFile(join(root, 'content/fr/a.mdx'), '# Guide manuel\n');
    await assert.rejects(sync({ root, locales: ['fr'], write: true, maxRequests: 5 }), /Unrecorded target/);
    assert.equal(await readFile(join(root, 'content/fr/a.mdx'), 'utf8'), '# Guide manuel\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('interrupted writes recover recorded outputs and still protect intervening human edits', async () => {
  const { recoverTransaction } = await import('./sync.mjs');
  const { hash } = await import('./extract.mjs');
  const root = await mkdtemp(join(tmpdir(), 'onekey-i18n-recover-'));
  try {
    await mkdir(join(root, 'content/fr'), { recursive: true });
    await mkdir(join(root, 'i18n'), { recursive: true });
    const content = '# Nouveau\n';
    const journal = { locale: 'fr', recorded: { 'a.mdx': { sourceHash: 'source', outputHash: hash(content), mode: 'generated' } }, changes: [{ path: 'a.mdx', beforeHash: null, content }] };
    await writeFile(join(root, 'i18n/.pending-fr.json'), JSON.stringify(journal));
    await writeFile(join(root, 'content/fr/a.mdx'), content); // interrupted after target write
    await recoverTransaction(root, 'fr');
    const manifest = JSON.parse(await readFile(join(root, 'i18n/manifest.json'), 'utf8'));
    assert.deepEqual(manifest.locales.fr, journal.recorded);
    await assert.rejects(readFile(join(root, 'i18n/.pending-fr.json')), { code: 'ENOENT' });
    await writeFile(join(root, 'i18n/.pending-fr.json'), JSON.stringify(journal));
    await writeFile(join(root, 'content/fr/a.mdx'), '# Human edit\n');
    await assert.rejects(recoverTransaction(root, 'fr'), /Manual target edit blocks recovery/);
    assert.equal(await readFile(join(root, 'content/fr/a.mdx'), 'utf8'), '# Human edit\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});
