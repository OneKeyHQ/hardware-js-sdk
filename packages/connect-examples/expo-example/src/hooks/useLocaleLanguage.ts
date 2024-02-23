import { useState, useEffect, useCallback } from 'react';
import { ILocaleSymbol } from '../../locale';
import { getDefaultLocale } from '../provider/AppIntlProvider/getDefaultLocale';
import { getItem, setItem } from '../utils/storeUtil';

const STORE_LOCALES_KEYS = '@onekey/locale';

export function useLocaleLanguage() {
  const [locale, setLocale] = useState<ILocaleSymbol>();

  useEffect(() => {
    // 异步读取存储的语言设置
    (async () => {
      const storedLocale = (await getItem(STORE_LOCALES_KEYS)) as ILocaleSymbol | null;
      if (storedLocale) {
        setLocale(storedLocale);
      } else {
        setLocale(getDefaultLocale());
      }
    })();
  }, []);

  const saveLocale = useCallback(async (newLocale: ILocaleSymbol) => {
    setLocale(newLocale);
    await setItem(STORE_LOCALES_KEYS, newLocale);
  }, []);

  return [locale, saveLocale] as const;
}
