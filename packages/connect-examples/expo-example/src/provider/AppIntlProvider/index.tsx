import { RawIntlProvider } from 'react-intl';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  memo,
  Suspense,
} from 'react';
import { isFunction } from 'lodash';
import { Text } from 'tamagui';
import { appLocale } from './AppLocale';
import { ILocaleSymbol, LOCALES } from '../../../locale';

import { useLocaleLanguage } from '../../hooks/useLocaleLanguage';

const AppLocaleContext = createContext<{
  locale: ILocaleSymbol | undefined;
  setLocale: (locale: ILocaleSymbol) => Promise<void>;
}>({
  locale: undefined,
  setLocale: async () => {},
});

export const useAppLocale = () => useContext(AppLocaleContext);

const loadLocaleMessages = async (locale: ILocaleSymbol) => {
  const messagesBuilder = await (LOCALES[locale] as unknown as Promise<
    () => Promise<Record<string, string>>
  >);
  return isFunction(messagesBuilder) ? messagesBuilder() : messagesBuilder;
};

const IntlContent = ({
  locale,
  children,
}: {
  locale: ILocaleSymbol | undefined;
  children: React.ReactNode;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [, setRefreshTs] = useState(0);

  useEffect(() => {
    if (!locale) return;

    setLoaded(false);
    let isMounted = true;

    loadLocaleMessages(locale).then(messages => {
      if (isMounted) {
        appLocale.setLocale(locale, messages);
        setLoaded(true);
        setRefreshTs(Date.now());
      }
    });

    return () => {
      isMounted = false;
    };
  }, [locale]);

  if (!loaded) return null;

  return <RawIntlProvider value={appLocale.intl}>{children}</RawIntlProvider>;
};

const IntlContentMemo = memo(IntlContent, (pre, next) => pre.locale === next.locale);

function AppIntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, saveLocale] = useLocaleLanguage();

  const providerValue = useMemo(
    () => ({
      locale,
      setLocale: saveLocale,
    }),
    [locale, saveLocale]
  );

  return (
    <AppLocaleContext.Provider value={providerValue}>
      <Suspense fallback={<Text>Loading...</Text>}>
        <IntlContentMemo locale={locale}>{children}</IntlContentMemo>
      </Suspense>
    </AppLocaleContext.Provider>
  );
}

export default AppIntlProvider;
