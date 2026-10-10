import en from './ui/en.json' with { type: 'json' };
import zh from './ui/zh.json' with { type: 'json' };
import fr from './ui/fr.json' with { type: 'json' };
import de from './ui/de.json' with { type: 'json' };
import es from './ui/es.json' with { type: 'json' };
import ja from './ui/ja.json' with { type: 'json' };

const messages = { en, zh, fr, de, es, ja };
export function ui(locale, source, chinese) {
  return messages[locale]?.[source] ?? (locale === 'zh' && chinese !== undefined ? chinese : source);
}
export function translateCopy(locale, value) {
  if (typeof value === 'string') return ui(locale, value);
  if (Array.isArray(value)) return value.map(item => translateCopy(locale, item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateCopy(locale, item)]));
  return value;
}
