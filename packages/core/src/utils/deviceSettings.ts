import { EDeviceType } from '@onekeyfe/hd-shared';

import type { IDeviceType } from '../types';

export const LANGUAGE_LABELS = {
  en: 'English',
  zh_cn: '简体中文',
  zh_hk: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Russian',
  es: 'Spanish',
  it: 'Italiano',
  pt_br: 'Portuguese (Brazil)',
} as const;

export type LanguageKey = keyof typeof LANGUAGE_LABELS;
export type LanguageOption = { code: LanguageKey; label: (typeof LANGUAGE_LABELS)[LanguageKey] };

export const PROTOCOL_V2_LANGUAGE_BY_KEY: Record<LanguageKey, string> = {
  en: 'en-Latn-US',
  zh_cn: 'zh-Hans-CN',
  zh_hk: 'zh-Hant-HK',
  ja: 'ja-Jpan-JP',
  ko: 'ko-Kore-KR',
  fr: 'fr-Latn-FR',
  de: 'de-Latn-DE',
  ru: 'ru-Cyrl-RU',
  es: 'es-Latn-ES',
  it: 'it-Latn-IT',
  pt_br: 'pt-Latn-BR',
};

export const mapLanguageToProtocolV2 = (language?: string) =>
  language ? PROTOCOL_V2_LANGUAGE_BY_KEY[language as LanguageKey] ?? language : undefined;

const PRO2_LANGUAGE_OPTIONS = [
  ...Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({ code, label })),
  { code: 'zh-Hant-TW', label: '繁體中文（台灣）' },
  { code: 'vi-Latn-VN', label: 'Tiếng Việt' },
  { code: 'tr-Latn-TR', label: 'Türkçe' },
  { code: 'id-Latn-ID', label: 'Bahasa Indonesia' },
  { code: 'fil-Latn-PH', label: 'Filipino' },
  { code: 'uk-Cyrl-UA', label: 'Українська' },
] as const;

export const getLanguageConfig = (deviceType: IDeviceType): Record<string, string>[] => {
  let keys: LanguageKey[] = [];

  switch (deviceType) {
    case EDeviceType.Classic:
    case EDeviceType.Mini:
      keys = ['en', 'zh_cn'];
      break;
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      keys = ['en', 'zh_cn', 'zh_hk', 'ja', 'pt_br', 'de', 'ko'];
      break;

    case EDeviceType.Touch:
    case EDeviceType.Pro:
      keys = Object.keys(LANGUAGE_LABELS) as LanguageKey[];
      break;
    case EDeviceType.Pro2:
      return PRO2_LANGUAGE_OPTIONS.map(option => ({ ...option }));
    default:
      keys = [];
      break;
  }

  return keys.map(key => ({ code: key, label: LANGUAGE_LABELS[key] }));
};

export type DurationParts = {
  seconds: number;
  minute: number;
  hour: number;
  day: number;
};

export const getAutoLockOptions = (_deviceType: IDeviceType): DurationParts[] => {
  switch (_deviceType) {
    case EDeviceType.Mini:
    case EDeviceType.Classic:
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      return [
        { seconds: 0, minute: 1, hour: 0, day: 0 },
        { seconds: 0, minute: 2, hour: 0, day: 0 },
        { seconds: 0, minute: 5, hour: 0, day: 0 },
        { seconds: 0, minute: 10, hour: 0, day: 0 },
        { seconds: 0, minute: 0, hour: 0, day: 0 },
      ];
    case EDeviceType.Touch:
    case EDeviceType.Pro:
      return [
        { seconds: 30, minute: 0, hour: 0, day: 0 },
        { seconds: 0, minute: 1, hour: 0, day: 0 },
        { seconds: 0, minute: 2, hour: 0, day: 0 },
        { seconds: 0, minute: 5, hour: 0, day: 0 },
        { seconds: 0, minute: 10, hour: 0, day: 0 },
        { seconds: 0, minute: 30, hour: 0, day: 0 },
        { seconds: 0, minute: 0, hour: 0, day: 0 },
      ];
    case EDeviceType.Pro2:
      return [
        { seconds: 30, minute: 0, hour: 0, day: 0 },
        { seconds: 0, minute: 1, hour: 0, day: 0 },
        { seconds: 0, minute: 2, hour: 0, day: 0 },
        { seconds: 0, minute: 5, hour: 0, day: 0 },
        { seconds: 0, minute: 10, hour: 0, day: 0 },
        { seconds: 0, minute: 30, hour: 0, day: 0 },
        { seconds: 0, minute: 0, hour: 0, day: 0 },
      ];
    default:
      return [];
  }
};

export const getAutoShutDownOptions = (_deviceType: IDeviceType): DurationParts[] => {
  switch (_deviceType) {
    case EDeviceType.Mini:
      return [];
    case EDeviceType.Classic:
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      return [
        { seconds: 0, minute: 1, hour: 0, day: 0 },
        { seconds: 0, minute: 3, hour: 0, day: 0 },
        { seconds: 0, minute: 5, hour: 0, day: 0 },
        { seconds: 0, minute: 10, hour: 0, day: 0 },
        { seconds: 0, minute: 0, hour: 0, day: 0 },
      ];
    case EDeviceType.Touch:
    case EDeviceType.Pro:
      return [
        { seconds: 0, minute: 1, hour: 0, day: 0 },
        { seconds: 0, minute: 2, hour: 0, day: 0 },
        { seconds: 0, minute: 5, hour: 0, day: 0 },
        { seconds: 0, minute: 10, hour: 0, day: 0 },
        { seconds: 0, minute: 0, hour: 0, day: 0 },
      ];
    case EDeviceType.Pro2:
      return [
        { seconds: 0, minute: 1, hour: 0, day: 0 },
        { seconds: 0, minute: 2, hour: 0, day: 0 },
        { seconds: 0, minute: 5, hour: 0, day: 0 },
        { seconds: 0, minute: 10, hour: 0, day: 0 },
        { seconds: 0, minute: 30, hour: 0, day: 0 },
        { seconds: 0, minute: 0, hour: 0, day: 0 },
      ];
    default:
      return [];
  }
};
