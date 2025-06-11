import React, { useEffect, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n, { i18nConfig } from "./config";
import LanguageDetector from "i18next-browser-languagedetector";

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize i18n on the client
    if (!i18n.isInitialized) {
      i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init(i18nConfig)
        .then(() => setIsInitialized(true));
    } else {
      setIsInitialized(true);
    }
  }, []);

  if (!isInitialized && typeof window !== "undefined") {
    // Return a loading state or nothing while i18n is initializing
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
