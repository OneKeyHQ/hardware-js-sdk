import { EDeviceType } from '@onekeyfe/hd-shared';

import {
  getAutoLockOptions,
  getAutoShutDownOptions,
  getDeviceSettingsCapabilities,
  getLanguageConfig,
  mapLanguageFromProtocolV2,
  mapLanguageToProtocolV2,
  PROTOCOL_V2_NEVER_TIMEOUT_MS,
} from '../src/utils/deviceSettings';

describe('Pro 2 device settings options', () => {
  test('returns stable SDK keys plus Pro2-only BCP-47 languages', () => {
    expect(getLanguageConfig(EDeviceType.Pro2)).toEqual([
      { code: 'en', label: 'English' },
      { code: 'zh_cn', label: '简体中文' },
      { code: 'zh_hk', label: '繁體中文' },
      { code: 'ja', label: '日本語' },
      { code: 'ko', label: '한국어' },
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' },
      { code: 'ru', label: 'Russian' },
      { code: 'es', label: 'Spanish' },
      { code: 'it', label: 'Italiano' },
      { code: 'pt_br', label: 'Portuguese (Brazil)' },
      { code: 'zh-Hant-TW', label: '繁體中文（台灣）' },
      { code: 'vi-Latn-VN', label: 'Tiếng Việt' },
      { code: 'tr-Latn-TR', label: 'Türkçe' },
      { code: 'id-Latn-ID', label: 'Bahasa Indonesia' },
      { code: 'fil-Latn-PH', label: 'Filipino' },
      { code: 'uk-Cyrl-UA', label: 'Українська' },
    ]);
  });

  test('maps shared language keys and preserves Pro2-only BCP-47 tags', () => {
    expect(mapLanguageToProtocolV2('en')).toBe('en-Latn-US');
    expect(mapLanguageToProtocolV2('zh_cn')).toBe('zh-Hans-CN');
    expect(mapLanguageToProtocolV2('pt_br')).toBe('pt-Latn-BR');
    expect(mapLanguageToProtocolV2('vi-Latn-VN')).toBe('vi-Latn-VN');
    expect(mapLanguageToProtocolV2(undefined)).toBeUndefined();
  });

  test('maps Protocol V2 tags back to the shared SDK language keys', () => {
    expect(mapLanguageFromProtocolV2('en-Latn-US')).toBe('en');
    expect(mapLanguageFromProtocolV2('zh-Hans-CN')).toBe('zh_cn');
    expect(mapLanguageFromProtocolV2('pt-Latn-BR')).toBe('pt_br');
    expect(mapLanguageFromProtocolV2('vi-Latn-VN')).toBe('vi-Latn-VN');
    expect(mapLanguageFromProtocolV2(undefined)).toBeUndefined();
  });

  test('returns the firmware-supported auto-lock delays', () => {
    expect(getAutoLockOptions(EDeviceType.Pro2, 'V2')).toEqual([
      { label: '30 seconds', valueMs: 30_000 },
      { label: '1 minute', valueMs: 60_000 },
      { label: '2 minutes', valueMs: 120_000 },
      { label: '5 minutes', valueMs: 300_000 },
      { label: '10 minutes', valueMs: 600_000 },
      { label: '30 minutes', valueMs: 1_800_000 },
      { label: 'Never', valueMs: PROTOCOL_V2_NEVER_TIMEOUT_MS },
    ]);
  });

  test('returns the firmware-supported auto-shutdown delays', () => {
    expect(getAutoShutDownOptions(EDeviceType.Pro2, 'V2')).toEqual([
      { label: '1 minute', valueMs: 60_000 },
      { label: '2 minutes', valueMs: 120_000 },
      { label: '5 minutes', valueMs: 300_000 },
      { label: '10 minutes', valueMs: 600_000 },
      { label: '30 minutes', valueMs: 1_800_000 },
      { label: 'Never', valueMs: PROTOCOL_V2_NEVER_TIMEOUT_MS },
    ]);
  });

  test('keeps the legacy and Protocol V2 never values protocol-specific', () => {
    expect(getAutoLockOptions(EDeviceType.Pro, 'V1').slice(-1)[0]).toEqual({
      label: 'Never',
      valueMs: 0,
    });
    expect(getAutoLockOptions(EDeviceType.Pro2, 'V2').slice(-1)[0]).toEqual({
      label: 'Never',
      valueMs: PROTOCOL_V2_NEVER_TIMEOUT_MS,
    });
  });

  test('returns one capability model for Protocol V1 and V2 consumers', () => {
    const v1 = getDeviceSettingsCapabilities(EDeviceType.Pro, 'V1');
    const v2 = getDeviceSettingsCapabilities(EDeviceType.Pro2, 'V2');

    expect(v1.supportedFields).toEqual(
      expect.arrayContaining(['label', 'safetyChecks', 'experimentalFeatures'])
    );
    expect(v1.supportedFields).not.toContain('brightness');
    expect(v2.supportedFields).toEqual(
      expect.arrayContaining(['label', 'brightness', 'airgapMode'])
    );
    expect(v2.supportedFields).not.toContain('safetyChecks');
    expect(v2.ranges.brightness).toEqual({ min: 10, max: 100 });
    expect(v1.safetyCheckOptions.map(option => option.value)).toEqual([0, 1, 2]);
    expect(v2.safetyCheckOptions).toEqual([]);
    expect(v2.onDeviceConfirmationFields).toEqual(['usePassphrase', 'airgapMode']);
  });
});
