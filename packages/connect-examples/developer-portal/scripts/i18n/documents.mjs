import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDocument, hash } from './extract.mjs';

export const portalRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function targetPath(root, locale, path) {
  if (!/^(en|zh|fr|de|es|ja)$/.test(locale)) throw new Error('Unsupported locale');
  if (path === '_ui.json') return join(root, 'i18n/ui', `${locale}.json`);
  if (
    path.startsWith('/') ||
    path.includes('..') ||
    path.includes('\\') ||
    !/\.(mdx|jsx?)$/.test(path)
  )
    throw new Error('Unsafe translation path');
  return join(root, 'content', locale, path);
}
export async function collectDocuments(root = portalRoot) {
  const documents = [];
  for (const name of (await readdir(join(root, 'content/en'), { recursive: true })).sort()) {
    if (!/\.(mdx|jsx?)$/.test(name)) continue;
    documents.push(extractDocument(await readFile(join(root, 'content/en', name), 'utf8'), name));
  }
  const source = await readFile(join(root, 'i18n/ui/en.json'), 'utf8');
  const messages = JSON.parse(source);
  documents.push({
    path: '_ui.json',
    source,
    sourceHash: hash(source),
    units: Object.entries(messages).map(([key, text]) => ({
      id: hash(`ui\0${key}\0${text}`),
      text,
      key,
    })),
  });
  return documents;
}
