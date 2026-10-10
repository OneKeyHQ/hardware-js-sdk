import { readFile, readdir, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translationLocales, publishedLocaleCodes } from '../../i18n/locales.mjs';
import { extractDocument, renderDocument, hash } from './extract.mjs';
import { translateBatch } from './provider.mjs';

export const portalRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = 'i18n/manifest.json';
const targetPath = (root, locale, path) => {
  if (path === '_ui.json') return join(root, 'i18n/ui', `${locale}.json`);
  if (path.startsWith('/') || path.includes('..') || path.includes('\\') || !/\.(mdx|js)$/.test(path)) throw new Error('Unsafe translation path');
  return join(root, 'content', locale, path);
};
export function validateCatalogEntry(unit, entry) {
  return entry?.source === unit.text && typeof entry.translation === 'string' && Boolean(entry.translation.trim());
}
export function missingUnits(units, catalog) {
  return [...new Map(units.filter(unit => !validateCatalogEntry(unit, catalog[unit.id])).map(unit => [unit.id, unit])).values()];
}
export function partitionUnits(units, maxChars = 6000) {
  const batches = [];
  let batch = [], size = 0;
  for (const unit of units) {
    if (unit.text.length > 20000) throw new Error('Translation unit too large; split the source paragraph');
    if (batch.length && (size + unit.text.length > maxChars || batch.length >= 80)) { batches.push(batch); batch = []; size = 0; }
    batch.push(unit); size += unit.text.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
async function fileHash(path) {
  try { return hash(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function save(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}
async function saveJson(path, value) { await save(path, `${JSON.stringify(value, null, 2)}\n`); }

// A write-ahead journal makes an interrupted locale update resumable without
// treating files already written by this run as human edits.
export async function recoverTransaction(root, locale) {
  const journalPath = join(root, `i18n/.pending-${locale}.json`);
  const journal = await readJson(journalPath, null);
  if (!journal) return;
  if (journal.locale !== locale || !Array.isArray(journal.changes)) throw new Error('Invalid translation recovery journal');
  for (const change of journal.changes) {
    const current = await fileHash(targetPath(root, locale, change.path));
    const next = change.content === null ? null : hash(change.content);
    if (current !== change.beforeHash && current !== next) throw new Error(`Manual target edit blocks recovery: ${locale}/${change.path}`);
  }
  for (const change of journal.changes) {
    const target = targetPath(root, locale, change.path);
    if (change.content === null) { if (await fileHash(target)) await unlink(target); }
    else await save(target, change.content);
  }
  const manifest = await readJson(join(root, manifestPath), { version: 1, locales: {} });
  manifest.locales[locale] = journal.recorded;
  await saveJson(join(root, manifestPath), manifest);
  await unlink(journalPath);
}

export async function collectDocuments(root = portalRoot) {
  const documents = [];
  for (const name of (await readdir(join(root, 'content/en'), { recursive: true })).sort()) {
    if (!/\.(mdx|js)$/.test(name)) continue;
    documents.push(extractDocument(await readFile(join(root, 'content/en', name), 'utf8'), name));
  }
  const uiPath = join(root, 'i18n/ui/en.json');
  try {
    const source = await readFile(uiPath, 'utf8');
    const messages = JSON.parse(source);
    documents.push({ path: '_ui.json', source, sourceHash: hash(source), units: Object.entries(messages).map(([key, text]) => ({ id: hash(`ui\0${key}\0${text}`), text, key })) });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return documents;
}

export async function sync({ root = portalRoot, locales = translationLocales, write = false, maxRequests = 0, config = {}, translate = translateBatch } = {}) {
  if (!locales.length || locales.some(locale => !translationLocales.includes(locale))) throw new Error('Unsupported target locale');
  if (write && (!Number.isSafeInteger(maxRequests) || maxRequests < 1 || maxRequests > 2000)) throw new Error('Set an explicit request limit between 1 and 2000 before translating');
  for (const locale of locales) {
    if (write) await recoverTransaction(root, locale);
    else if (await fileHash(join(root, `i18n/.pending-${locale}.json`))) throw new Error(`Interrupted ${locale} sync: resume with --write before planning`);
  }
  const documents = await collectDocuments(root);
  const manifest = await readJson(join(root, manifestPath), { version: 1, locales: {} });
  const summary = [];
  let requests = 0;
  for (const locale of locales) {
    const catalogPath = join(root, `i18n/catalogs/${locale}.json`);
    const catalog = await readJson(catalogPath, {});
    const recorded = manifest.locales[locale] || {};
    const pending = [];
    for (const document of documents) {
      const previous = recorded[document.path];
      const currentHash = await fileHash(targetPath(root, locale, document.path));
      if (!previous && currentHash) throw new Error(`Unrecorded target requires review before automatic replacement: ${locale}/${document.path}`);
      if (previous && currentHash && previous.outputHash !== currentHash) throw new Error(`Manual target edit requires review before automatic replacement: ${locale}/${document.path}`);
      if (previous?.sourceHash !== document.sourceHash || !currentHash) pending.push(document);
    }
    const missing = missingUnits(pending.flatMap(document => document.units), catalog);
    const batches = partitionUnits(missing);
    const removed = Object.keys(recorded).filter(path => !documents.some(document => document.path === path));
    for (const path of removed) {
      const currentHash = await fileHash(targetPath(root, locale, path));
      if (currentHash && currentHash !== recorded[path].outputHash) throw new Error(`Refusing to remove edited translation: ${locale}/${path}`);
    }
    summary.push({ locale, pages: pending.filter(document => document.path.endsWith('.mdx')).length, navigationFiles: pending.filter(document => document.path.endsWith('.js')).length, units: missing.length, characters: missing.reduce((sum, unit) => sum + unit.text.length, 0), requests: batches.length, removed: removed.length });
    if (!write) continue;
    for (const batch of batches) {
      if (requests >= maxRequests) throw new Error('Translation request limit reached; completed batches are saved. Resume with another explicit limit.');
      requests++;
      const translated = await translate(batch, locale, config);
      for (const unit of batch) {
        if (typeof translated?.[unit.id] !== 'string' || !translated[unit.id].trim()) throw new Error('Provider returned an incomplete translation batch');
      }
      for (const unit of batch) catalog[unit.id] = { source: unit.text, translation: translated[unit.id] };
      await saveJson(catalogPath, catalog);
      console.log(`Translation ${locale}: saved batch ${requests}; ${batch.length} units`);
    }
    const outputs = pending.map(document => ({ document, content: document.path === '_ui.json' ? `${JSON.stringify(Object.fromEntries(document.units.map(unit => [unit.key, catalog[unit.id]?.translation])), null, 2)}\n` : renderDocument(document, Object.fromEntries(document.units.map(unit => [unit.id, catalog[unit.id]?.translation])), locale) }));
    const changes = [];
    for (const { document, content } of outputs) {
      changes.push({ path: document.path, beforeHash: await fileHash(targetPath(root, locale, document.path)), content });
      recorded[document.path] = { sourceHash: document.sourceHash, outputHash: hash(content), mode: 'generated' };
    }
    for (const path of removed) {
      changes.push({ path, beforeHash: await fileHash(targetPath(root, locale, path)), content: null });
      delete recorded[path];
    }
    if (changes.length) {
      await saveJson(join(root, `i18n/.pending-${locale}.json`), { locale, changes, recorded });
      await recoverTransaction(root, locale);
    }
    manifest.locales[locale] = recorded;
  }
  return summary;
}

export async function checkPublished(root = portalRoot) {
  const documents = await collectDocuments(root);
  const manifest = await readJson(join(root, manifestPath), { locales: {} });
  const errors = [];
  for (const locale of publishedLocaleCodes.filter(code => code !== 'en')) {
    const recorded = manifest.locales[locale] || {};
    for (const document of documents) {
      const entry = recorded[document.path];
      if (entry?.sourceHash !== document.sourceHash) errors.push(`Stale translation: ${locale}/${document.path}`);
      if (entry?.outputHash !== await fileHash(targetPath(root, locale, document.path))) errors.push(`Missing or unrecorded translation: ${locale}/${document.path}`);
    }
    for (const path of Object.keys(recorded)) if (!documents.some(document => document.path === path)) errors.push(`Removed source still has a translation: ${locale}/${path}`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--check')) {
      const errors = await checkPublished();
      if (errors.length) throw new Error(errors.join('\n'));
      console.log('Published locale source and output hashes are current');
    } else {
      const localeArg = args.find(arg => arg.startsWith('--locales='));
      const summary = await sync({
        locales: localeArg ? localeArg.slice('--locales='.length).split(',') : translationLocales,
        write: args.includes('--write'),
        maxRequests: Number(process.env.DOCS_TRANSLATION_MAX_REQUESTS || 0),
        config: { baseUrl: process.env.DOCS_TRANSLATION_BASE_URL, model: process.env.DOCS_TRANSLATION_MODEL, apiKey: process.env.DOCS_TRANSLATION_API_KEY },
      });
      console.log(JSON.stringify(summary, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
