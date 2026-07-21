import { EDeviceType } from '@onekeyfe/hd-shared';

import {
  getAutoLockOptions,
  getAutoShutDownOptions,
  getLanguageConfig,
} from '../src/utils/deviceSettings';

describe('Pro 2 device settings options', () => {
  test('returns the firmware-supported BCP-47 languages', () => {
    expect(getLanguageConfig(EDeviceType.Pro2)).toEqual([
      { code: 'en-Latn-US', label: 'English' },
      { code: 'zh-Hans-CN', label: '简体中文' },
      { code: 'zh-Hant-HK', label: '繁體中文（香港）' },
      { code: 'zh-Hant-TW', label: '繁體中文（台灣）' },
      { code: 'ja-Jpan-JP', label: '日本語' },
      { code: 'ko-Kore-KR', label: '한국어' },
      { code: 'fr-Latn-FR', label: 'Français' },
      { code: 'de-Latn-DE', label: 'Deutsch' },
      { code: 'ru-Cyrl-RU', label: 'Русский' },
      { code: 'es-Latn-ES', label: 'Español' },
      { code: 'it-Latn-IT', label: 'Italiano' },
      { code: 'pt-Latn-BR', label: 'Portuguese (Brazil)' },
      { code: 'vi-Latn-VN', label: 'Tiếng Việt' },
      { code: 'tr-Latn-TR', label: 'Türkçe' },
      { code: 'id-Latn-ID', label: 'Bahasa Indonesia' },
      { code: 'fil-Latn-PH', label: 'Filipino' },
      { code: 'uk-Cyrl-UA', label: 'Українська' },
    ]);
  });

  test('returns the firmware-supported auto-lock delays', () => {
    expect(getAutoLockOptions(EDeviceType.Pro2)).toEqual([
      { seconds: 30, minute: 0, hour: 0, day: 0 },
      { seconds: 0, minute: 1, hour: 0, day: 0 },
      { seconds: 0, minute: 2, hour: 0, day: 0 },
      { seconds: 0, minute: 5, hour: 0, day: 0 },
      { seconds: 0, minute: 10, hour: 0, day: 0 },
      { seconds: 0, minute: 30, hour: 0, day: 0 },
      { seconds: 0, minute: 0, hour: 0, day: 0 },
    ]);
  });

  test('returns the firmware-supported auto-shutdown delays', () => {
    expect(getAutoShutDownOptions(EDeviceType.Pro2)).toEqual([
      { seconds: 0, minute: 1, hour: 0, day: 0 },
      { seconds: 0, minute: 2, hour: 0, day: 0 },
      { seconds: 0, minute: 5, hour: 0, day: 0 },
      { seconds: 0, minute: 10, hour: 0, day: 0 },
      { seconds: 0, minute: 30, hour: 0, day: 0 },
      { seconds: 0, minute: 0, hour: 0, day: 0 },
    ]);
  });
});
