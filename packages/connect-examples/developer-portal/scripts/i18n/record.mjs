import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDocuments, portalRoot, targetPath } from './documents.mjs';
import { hash } from './extract.mjs';
import { validateTranslation } from './check.mjs';
import { translationLocales } from '../../i18n/locales.mjs';

// This is an explicit review acknowledgement, not a translation or quality claim.
export async function recordTranslations({ root = portalRoot, locale, paths }) {
  if (!translationLocales.includes(locale) || !paths?.length)
    throw new Error('Specify a target locale and the exact reviewed paths');
  const documents = await collectDocuments(root);
  const manifestPath = `${root}/i18n/manifest.json`;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.locales[locale] ||= {};
  for (const path of paths) {
    const document = documents.find(item => item.path === path);
    if (!document) throw new Error(`Unknown English source: ${path}`);
    const target = await readFile(targetPath(root, locale, path), 'utf8');
    const errors = validateTranslation(document.source, target, path, locale);
    if (errors.length) throw new Error(`${locale}/${path}: ${errors.join('; ')}`);
    manifest.locales[locale][path] = {
      sourceHash: document.sourceHash,
      outputHash: hash(target),
      mode: 'translated',
    };
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [locale, ...paths] = process.argv.slice(2);
  await recordTranslations({ locale, paths });
  console.log(`Recorded ${paths.length} reviewed ${locale} files`);
}
