import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedLocaleCodes } from '../../i18n/locales.mjs';
import { collectDocuments, portalRoot, targetPath } from './documents.mjs';
import { hash, inspectDocument, navigationSignature, mdxRuntimeSignature } from './extract.mjs';
import { localizedPath } from '../../i18n/locales.mjs';
import { collectUI } from './extract-ui.mjs';

const sorted = values => [...values].sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function validateTranslation(source, target, path, locale) {
  const errors = [];
  if (path === '_ui.json') {
    const original = JSON.parse(source),
      translated = JSON.parse(target);
    if (!same(sorted(Object.keys(original)), sorted(Object.keys(translated))))
      errors.push('UI keys differ from English');
    for (const [key, value] of Object.entries(original)) {
      if (typeof translated[key] !== 'string' || !translated[key].trim()) {
        errors.push(`Missing UI translation: ${key}`);
        continue;
      }
      const placeholders = text => sorted(text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || []);
      if (!same(placeholders(value), placeholders(translated[key])))
        errors.push(`Changed UI placeholders: ${key}`);
    }
    return errors;
  }
  if (
    locale !== 'zh' &&
    /_meta\.jsx?$/.test(path) &&
    !same(navigationSignature(source), navigationSignature(target, locale))
  )
    errors.push('Navigation structure, slugs, imports or behavior differ from English');
  if (
    locale !== 'zh' &&
    path.endsWith('.mdx') &&
    !same(mdxRuntimeSignature(source), mdxRuntimeSignature(target, locale))
  )
    errors.push('MDX runtime imports, expressions or component behavior differ from English');
  const original = inspectDocument(source, path),
    translated = inspectDocument(target, path);
  const fences = document => document.code.filter(item => item.type === 'code');
  const literals = document =>
    sorted(document.code.filter(item => item.type === 'inlineCode').map(item => item.value));
  if (
    locale !== 'zh' &&
    (!same(fences(original), fences(translated)) || !same(literals(original), literals(translated)))
  )
    errors.push('Code examples or inline API literals differ from English');
  const expectedLinks = sorted(original.links.map(link => localizedPath(link, locale)));
  if (locale !== 'zh' && !same(expectedLinks, sorted(translated.links)))
    errors.push('Links differ from English or use the wrong locale');
  if (locale !== 'zh')
    for (const heading of original.headings)
      if (!translated.anchors.includes(heading)) errors.push(`Missing original anchor: ${heading}`);
  return errors;
}

export async function checkLocales({
  root = portalRoot,
  locales = publishedLocaleCodes.filter(locale => locale !== 'en'),
} = {}) {
  const documents = await collectDocuments(root);
  const manifest = JSON.parse(await readFile(`${root}/i18n/manifest.json`, 'utf8'));
  const errors = [];
  const catalog = JSON.parse(documents.find(document => document.path === '_ui.json').source);
  for (const key of Object.keys(await collectUI(root)))
    if (!(key in catalog))
      errors.push(`Uncatalogued UI message: ${key}; run yarn i18n:extract-ui and translate it`);
  for (const locale of locales) {
    const recorded = manifest.locales[locale] || {};
    const paths = new Set(documents.map(document => document.path));
    for (const document of documents) {
      const label = `${locale}/${document.path}`;
      let content;
      try {
        content = await readFile(targetPath(root, locale, document.path), 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          errors.push(`Missing translation: ${label}`);
          continue;
        }
        throw error;
      }
      const entry = recorded[document.path];
      if (entry?.sourceHash !== document.sourceHash)
        errors.push(`English changed; update translation: ${label}`);
      if (entry?.outputHash !== hash(content))
        errors.push(`Translation changed; review and record: ${label}`);
      try {
        for (const error of validateTranslation(document.source, content, document.path, locale))
          errors.push(`${label}: ${error}`);
      } catch (error) {
        errors.push(`${label}: ${error.message}`);
      }
    }
    for (const path of Object.keys(recorded))
      if (!paths.has(path)) errors.push(`Removed English source still recorded: ${locale}/${path}`);
    try {
      for (const path of await readdir(`${root}/content/${locale}`, { recursive: true })) {
        if (/\.(mdx|jsx?)$/.test(path) && !paths.has(path))
          errors.push(`Unexpected translated page: ${locale}/${path}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.find(value => value.startsWith('--locales='));
  const errors = await checkLocales(arg ? { locales: arg.slice(10).split(',') } : {});
  if (process.argv.includes('--json')) console.log(JSON.stringify({ errors }, null, 2));
  else if (errors.length) console.error(errors.join('\n'));
  else
    console.log(
      'Localization: every published document, UI key, source hash and output hash is current'
    );
  if (errors.length) process.exitCode = 1;
}
