import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, readContent } from './check-content.mjs';

const names = process.argv.slice(2);
if (!names.length) throw new Error('Pass the locale-relative MDX paths you have reviewed, for example hardware-sdk/getting-started.mdx.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'docs/content-review.json');
const review = JSON.parse(await readFile(path, 'utf8'));
const files = await readContent(root);
const manifestPath = join(root, 'i18n/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.locales.zh ||= {};
for (const name of names) {
  if (!name.endsWith('.mdx') || !files[`content/en/${name}`] || !files[`content/zh/${name}`]) {
    throw new Error(`Both locale files must exist: ${name}`);
  }
  review.pages[name] = Object.fromEntries(['en', 'zh'].map(locale => [locale, contentHash(files[`content/${locale}/${name}`])]));
  manifest.locales.zh[name] = { sourceHash: review.pages[name].en, outputHash: review.pages[name].zh, mode: 'reviewed-baseline' };
}
await writeFile(path, JSON.stringify(review, null, 2) + '\n');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Recorded review of ${names.length} explicitly selected bilingual page pairs`);
