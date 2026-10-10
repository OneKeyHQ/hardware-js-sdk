
import { ui } from '../i18n/ui.mjs'
import { publishedLocaleCodes } from '../i18n/locales.mjs';

const indexes = new Map();
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\/+|\/+$/g, '');
const prefix = basePath ? `/${basePath}` : '';

export function getSearchSuggestions(lang) {
  return [
    [ui(lang, 'Choose an integration', '选择接入方式'), 'getting-started'],
    [ui(lang, 'Connect a dApp', 'dApp 快速开始'), 'connect-to-software'],
    [ui(lang, 'Hardware SDK quickstart', '硬件 SDK 快速开始'), 'hardware-sdk/getting-started'],
    [ui(lang, 'Troubleshoot an integration', '排查集成问题'), 'troubleshooting'],
  ].map(([title, path]) => ({ id: path, title, href: `${prefix}/${lang}/${path}/`, path: `${prefix}/${lang}/${path}/` }));
}

export async function searchDocumentation(query, lang) {
  const language = publishedLocaleCodes.includes(lang) ? lang : 'en';
  if (!indexes.has(language)) {
    const indexUrl = `${prefix}/_pagefind/${language}/pagefind.js`;
    indexes.set(language, import(/* webpackIgnore: true */ indexUrl).then(async index => {
      await index.options({ baseUrl: `${prefix}/${language}/` });
      return index;
    }).catch(error => {
      indexes.delete(language);
      throw error;
    }));
  }
  const index = await indexes.get(language);
  const results = await index.search(query.trim());
  if (!results) return [];
  const pages = await Promise.all(results.results.slice(0, 24).map(async result => ({
    id: result.id,
    data: await result.data(),
  })));
  const entries = pages.flatMap(({ id, data }) => {
    const url = new URL(data.url, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(`${prefix}/${language}/`)) return [];
    return [{ id, title: data.meta?.title || url.pathname, href: `${url.pathname}${url.hash}`, path: url.pathname }];
  });
  // Method names often differ from headings only in casing and separators.
  // Keep Pagefind relevance for ties, but put an exact title match first.
  const normalize = value => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const term = normalize(query);
  const score = entry => {
    const method = entry.path.split('/').filter(Boolean).at(-1) || '';
    return normalize(entry.title) === term || normalize(method) === term ? 2 : normalize(entry.title).includes(term) ? 1 : 0;
  };
  return entries.sort((a, b) => score(b) - score(a));
}
