import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const contentHash = value => createHash('sha256').update(value).digest('hex');

// Review hashes detect drift; they do not certify translation quality.
export function validateContent(files, review, migration, hash = contentHash, synchronized = {}) {
  const errors = [];
  const names = new Set(Object.keys(files).map(file => file.replace(/^content\/(en|zh)\//, '')));
  for (const name of names) {
    const en = files[`content/en/${name}`];
    const zh = files[`content/zh/${name}`];
    if (en === undefined) errors.push(`Missing English page: ${name}`);
    if (zh === undefined) errors.push(`Missing Chinese page: ${name}`);
    const recorded = review.pages[name];
    const generated = synchronized[name];
    const synchronizedPair = generated?.mode === 'generated' && generated.sourceHash === hash(en || '') && generated.outputHash === hash(zh || '');
    if (en !== undefined && zh !== undefined && !synchronizedPair && (!recorded || recorded.en !== hash(en) || recorded.zh !== hash(zh))) {
      errors.push(`Bilingual review required: ${name}`);
    }
  }
  for (const name of Object.keys(review.pages)) {
    if (!names.has(name)) errors.push(`Stale review entry: ${name}`);
  }
  if (migration.pages.length !== migration.reviewedSourcePages) errors.push('GitBook source count does not match the migration ledger');
  const sources = new Set();
  for (const page of migration.pages) {
    if (sources.has(page.source)) errors.push(`Duplicate GitBook source: ${page.source}`);
    sources.add(page.source);
    if (!['adapted', 'integrated', 'archived'].includes(page.disposition)) errors.push(`Unknown migration disposition: ${page.source}`);
    if (!page.targets.length) errors.push(`No migration target: ${page.source}`);
    for (const target of page.targets) {
      if (!(target in files)) errors.push(`Missing migration target: ${target}`);
    }
  }
  return errors;
}

export async function readContent(root) {
  const files = {};
  for (const locale of ['en', 'zh']) {
    for (const name of await readdir(join(root, 'content', locale), { recursive: true })) {
      if (!name.endsWith('.mdx')) continue;
      files[`content/${locale}/${name}`] = await readFile(join(root, 'content', locale, name), 'utf8');
    }
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const files = await readContent(root);
  const review = JSON.parse(await readFile(join(root, 'docs/content-review.json'), 'utf8'));
  const migration = JSON.parse(await readFile(join(root, 'docs/gitbook-migration.json'), 'utf8'));
  const translationManifest = JSON.parse(await readFile(join(root, 'i18n/manifest.json'), 'utf8'));
  const errors = validateContent(files, review, migration, contentHash, translationManifest.locales.zh);
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error('\nReview both languages, then update only the reviewed entries in docs/content-review.json. See docs/content-maintenance.md.');
    process.exitCode = 1;
  } else {
    console.log(`Content: ${Object.keys(review.pages).length} bilingual page pairs and ${migration.pages.length} GitBook source dispositions checked`);
  }
}
