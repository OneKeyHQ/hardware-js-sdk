import { getLocales } from 'expo-localization';

import { LOCALES as _LOCALES } from '../../../locale/localeJsonMap';

import type { ILocaleSymbol } from '../../../locale';

export function getDefaultLocale(): ILocaleSymbol {
  const locales = getLocales();
  const localesKey = Object.keys(_LOCALES);
  if (locales.length > 0) {
    const finder = locales.find(locale => {
      if (locale.languageTag) {
        return localesKey.includes(locale.languageTag);
      }
      return false;
    });
    if (finder) {
      return finder.languageTag as ILocaleSymbol;
    }
  }

  return 'en-US';
}
