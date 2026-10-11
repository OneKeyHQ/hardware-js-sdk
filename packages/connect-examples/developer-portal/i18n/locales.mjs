export const locales = Object.freeze([
  { code: 'en', name: 'English', language: 'English' },
  { code: 'zh', name: '简体中文', language: 'Simplified Chinese' },
  { code: 'fr', name: 'Français', language: 'French' },
  { code: 'de', name: 'Deutsch', language: 'German' },
  { code: 'es', name: 'Español', language: 'Spanish' },
  { code: 'ja', name: '日本語', language: 'Japanese' },
]);

export const localeCodes = locales.map(locale => locale.code);
export const translationLocales = localeCodes.filter(code => code !== 'en');
// Add a locale here only after its complete content and UI catalogs pass acceptance.
export const publishedLocaleCodes = ['en', 'zh'];
export const publishedLocales = locales.filter(locale => publishedLocaleCodes.includes(locale.code));

const prefixFor = base => base ? `/${base.replace(/^\/+|\/+$/g, '')}` : '';

export function localeFromPath(path, basePath = '') {
  const prefix = prefixFor(basePath);
  const relative = prefix && path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
  const code = relative.split(/[/?#]/)[1];
  return localeCodes.includes(code) ? code : 'en';
}

export function localizedPath(path, locale, basePath = '') {
  if (!localeCodes.includes(locale)) throw new Error(`Unsupported locale: ${locale}`);
  const prefix = prefixFor(basePath);
  if (!path.startsWith(`${prefix}/`) || path.startsWith('//')) return path;
  const relative = path.slice(prefix.length);
  const match = relative.match(/^\/([^/?#]+)(?=[/?#]|$)/);
  if (!match || !localeCodes.includes(match[1])) return path;
  return `${prefix}/${locale}${relative.slice(match[0].length)}`;
}
