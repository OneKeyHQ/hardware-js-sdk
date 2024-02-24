import { getLocales } from 'expo-localization';
import { ILocaleSymbol } from '../../../locale';
import { LOCALES as _LOCALES } from '../../../locale/localeJsonMap';

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
