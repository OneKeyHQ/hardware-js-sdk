import { LOCALES as _LOCALES } from './localeJsonMap';

export type ILocaleSymbol = keyof typeof _LOCALES;
export const LOCALES = _LOCALES as Record<ILocaleSymbol, () => Promise<any>>;
