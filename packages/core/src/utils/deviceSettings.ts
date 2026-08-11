import { EDeviceType } from '@onekeyfe/hd-shared';
import { Enum_SafetyCheckLevel } from '@onekeyfe/hd-transport';

import type { IDeviceType } from '../types';
import type { DeviceSettingsParams } from '../types/api/deviceSettings';
import type { SafetyCheckLevel } from '@onekeyfe/hd-transport';

export type DeviceSettingsProtocol = 'V1' | 'V2';
export type DeviceSettingsField = keyof DeviceSettingsParams;

export const DEVICE_SETTINGS_SHARED_FIELDS = [
  'language',
  'label',
  'usePassphrase',
  'autoLockDelayMs',
  'autoShutdownDelayMs',
  'hapticFeedback',
  'bluetoothEnabled',
] as const satisfies readonly DeviceSettingsField[];

export const DEVICE_SETTINGS_V1_ONLY_FIELDS = [
  'homescreen',
  'passphraseSource',
  'displayRotation',
  'passphraseAlwaysOnDevice',
  'safetyChecks',
  'experimentalFeatures',
  'changeBrightness',
] as const satisfies readonly DeviceSettingsField[];

export const DEVICE_SETTINGS_V2_ONLY_FIELDS = [
  'brightness',
  'airgapMode',
  'animationEnabled',
  'tapToWake',
  'deviceNameDisplayEnabled',
  'fidoEnabled',
  'usbLockEnabled',
  'randomKeypad',
] as const satisfies readonly DeviceSettingsField[];

export const PROTOCOL_V2_NEVER_TIMEOUT_MS = 0x10000000;

export const normalizeSafetyCheckLevel = (
  value: SafetyCheckLevel | null | undefined
): Enum_SafetyCheckLevel | null | undefined => {
  if (typeof value === 'number' || value === null || value === undefined) return value;
  return Enum_SafetyCheckLevel[value];
};

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

const PROTOCOL_V2_LANGUAGE_KEY_BY_TAG = Object.fromEntries(
  Object.entries(PROTOCOL_V2_LANGUAGE_BY_KEY).map(([key, tag]) => [tag, key])
) as Record<string, LanguageKey>;

export const mapLanguageFromProtocolV2 = (language?: string) =>
  language ? PROTOCOL_V2_LANGUAGE_KEY_BY_TAG[language] ?? language : undefined;

const PRO2_LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'zh_cn', label: '简体中文' },
  { code: 'zh_hk', label: '繁體中文（香港）' },
  { code: 'zh-Hant-TW', label: '繁體中文（台灣）' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt_br', label: 'Portuguese (Brazil)' },
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
    case EDeviceType.Neo:
      return PRO2_LANGUAGE_OPTIONS.map(option => ({ ...option }));
    default:
      keys = [];
      break;
  }

  return keys.map(key => ({ code: key, label: LANGUAGE_LABELS[key] }));
};

export type DeviceSettingsDurationOption = {
  label: string;
  valueMs: number;
};

export type DeviceSettingsValueOption<T> = {
  label: string;
  value: T;
};

const durationOption = (valueMs: number): DeviceSettingsDurationOption => {
  if (valueMs === 0 || valueMs === PROTOCOL_V2_NEVER_TIMEOUT_MS) {
    return { label: 'Never', valueMs };
  }
  if (valueMs < 60_000) {
    return { label: `${valueMs / 1000} seconds`, valueMs };
  }
  const minutes = valueMs / 60_000;
  return { label: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`, valueMs };
};

const withNever = (
  values: readonly number[],
  protocol: DeviceSettingsProtocol
): DeviceSettingsDurationOption[] =>
  [...values, protocol === 'V2' ? PROTOCOL_V2_NEVER_TIMEOUT_MS : 0].map(durationOption);

export const getAutoLockOptions = (
  deviceType: IDeviceType,
  protocol: DeviceSettingsProtocol
): DeviceSettingsDurationOption[] => {
  switch (deviceType) {
    case EDeviceType.Mini:
    case EDeviceType.Classic:
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      return withNever([60_000, 120_000, 300_000, 600_000], protocol);
    case EDeviceType.Touch:
    case EDeviceType.Pro:
    case EDeviceType.Pro2:
    case EDeviceType.Neo:
      return withNever([30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000], protocol);
    default:
      return [];
  }
};

export const getAutoShutDownOptions = (
  deviceType: IDeviceType,
  protocol: DeviceSettingsProtocol
): DeviceSettingsDurationOption[] => {
  switch (deviceType) {
    case EDeviceType.Mini:
      return [];
    case EDeviceType.Classic:
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      return withNever([60_000, 180_000, 300_000, 600_000], protocol);
    case EDeviceType.Touch:
    case EDeviceType.Pro:
      return withNever([60_000, 120_000, 300_000, 600_000], protocol);
    case EDeviceType.Pro2:
    case EDeviceType.Neo:
      return withNever([60_000, 120_000, 300_000, 600_000], protocol);
    default:
      return [];
  }
};

export type DeviceSettingsCapabilities = {
  protocol: DeviceSettingsProtocol;
  supportedFields: readonly DeviceSettingsField[];
  languageOptions: ReadonlyArray<Record<string, string>>;
  autoLockDelayOptions: readonly DeviceSettingsDurationOption[];
  autoShutdownDelayOptions: readonly DeviceSettingsDurationOption[];
  ranges: {
    brightness?: { min: number; max: number };
  };
  safetyCheckOptions: ReadonlyArray<DeviceSettingsValueOption<Enum_SafetyCheckLevel>>;
  onDeviceConfirmationFields: readonly DeviceSettingsField[];
};

export const getDeviceSettingsCapabilities = (
  deviceType: IDeviceType,
  protocol: DeviceSettingsProtocol
): DeviceSettingsCapabilities => ({
  protocol,
  supportedFields:
    protocol === 'V2'
      ? [...DEVICE_SETTINGS_SHARED_FIELDS, ...DEVICE_SETTINGS_V2_ONLY_FIELDS]
      : [...DEVICE_SETTINGS_SHARED_FIELDS, ...DEVICE_SETTINGS_V1_ONLY_FIELDS],
  languageOptions: getLanguageConfig(deviceType),
  autoLockDelayOptions: getAutoLockOptions(deviceType, protocol),
  autoShutdownDelayOptions: getAutoShutDownOptions(deviceType, protocol),
  ranges: protocol === 'V2' ? { brightness: { min: 10, max: 100 } } : {},
  safetyCheckOptions:
    protocol === 'V1'
      ? [
          { label: 'Strict', value: Enum_SafetyCheckLevel.Strict },
          { label: 'Prompt Always', value: Enum_SafetyCheckLevel.PromptAlways },
          { label: 'Prompt Temporarily', value: Enum_SafetyCheckLevel.PromptTemporarily },
        ]
      : [],
  onDeviceConfirmationFields: protocol === 'V2' ? ['usePassphrase', 'airgapMode'] : [],
});
