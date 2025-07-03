import i18n, { InitOptions, use } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { locales } from './locales';

// i18n configuration
const i18nConfig: InitOptions = {
  resources: locales,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  debug: process.env.NODE_ENV === 'development',
  keySeparator: '.',
  nsSeparator: false,
};

// Initialize i18n (client-side only)
if (typeof window !== 'undefined') {
  use(LanguageDetector).use(initReactI18next).init(i18nConfig);
}

export default i18n;
export { i18nConfig };
