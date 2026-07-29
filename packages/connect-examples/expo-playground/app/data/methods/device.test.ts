import { describe, expect, test } from '@jest/globals';
import { getDeviceSettingsCapabilities, PROTOCOL_V2_NEVER_TIMEOUT_MS } from '@onekeyfe/hd-core';
import { EDeviceType } from '@onekeyfe/hd-shared';

import { device } from './device';
import { pro2Debug } from './pro2Debug';
import { getDeviceMethodSection } from './deviceCategories';
import { parseParameterValue } from '../../utils/parameterUtils';
import { en } from '../../i18n/locales/en';
import { zh } from '../../i18n/locales/zh';

describe('Pro2 设备方法配置', () => {
  test('公开统一状态、解锁和 Pro2 独立业务方法', () => {
    const methods = new Set(device.api.map(item => item.method));

    expect(methods.has('deviceUnlock')).toBe(true);
    expect(methods.has('getDeviceState')).toBe(true);
    expect(methods.has('refreshDeviceState' as never)).toBe(false);
    expect(methods.has('deviceGetOnboardingStatus')).toBe(true);
    expect(methods.has('uploadPortfolio')).toBe(true);
    expect(methods.has('deviceSessionOpen' as never)).toBe(false);
  });

  test('公开 Device 模块当前可测试的公共 API', () => {
    const methods = new Set(device.api.map(item => item.method));

    [
      'promptWebDeviceAccess',
      'getOnekeyFeatures',
      'getPassphraseState',
      'openWalletSession',
      'clearSessionCache',
      'testInitializeDeviceDuration',
      'preInitialize',
      'deviceBackup',
      'deviceReset',
      'deviceRecovery',
      'deviceFlags',
    ].forEach(method => {
      expect(methods.has(method as never)).toBe(true);
    });
  });

  test('仅保留旧协议 feature 方法作为废弃兼容入口', () => {
    ['getFeatures', 'getOnekeyFeatures'].forEach(methodName => {
      expect(device.api.find(item => item.method === methodName)?.deprecated).toBe(true);
    });

    ['deviceSettingsGet', 'deviceSettingsSet', 'deviceSettingsPageShow'].forEach(methodName => {
      expect(device.api.some(item => item.method === methodName)).toBe(false);
      expect(pro2Debug.api.some(item => item.method === methodName)).toBe(false);
    });
    expect(pro2Debug.api.map(item => String(item.method))).not.toContain('deviceSessionOpen');
  });

  test('Pro2 onboarding 与 Portfolio 能力保持为独立公开接口', () => {
    const onboarding = device.api.find(item => item.method === 'deviceGetOnboardingStatus');
    const portfolio = device.api.find(item => item.method === 'uploadPortfolio');

    expect(onboarding?.deprecated).not.toBe(true);
    expect(onboarding?.supportedDevices).toEqual(['Pro2']);
    expect(portfolio?.deprecated).not.toBe(true);
    expect(portfolio?.supportedDevices).toEqual(['Pro2']);
    expect(portfolio?.presets[0]?.parameters[0]).toEqual(
      expect.objectContaining({
        name: 'packageBytes',
        type: 'file',
        accept: '.okpkg',
      })
    );
  });

  test('统一设置入口覆盖 passphrase 和 air-gap 页面语义', () => {
    const method = device.api.find(item => item.method === 'deviceSettings');
    const presets = method?.presets.map(item => item.title);

    expect(presets).toEqual(
      expect.arrayContaining([
        'Enable Passphrase',
        'Disable Passphrase',
        'Enable Air-gap Mode (Protocol V2)',
        'Disable Air-gap Mode (Protocol V2)',
      ])
    );
    expect(presets?.filter(title => title.includes('Enable Air-gap Mode'))).toHaveLength(1);
    expect(presets?.filter(title => title.includes('Disable Air-gap Mode'))).toHaveLength(1);
  });

  test('统一设置入口覆盖公共、V1-only 与 V2-only 字段', () => {
    const method = device.api.find(item => item.method === 'deviceSettings');
    const parameterNames = new Set(
      method?.presets.flatMap(preset => preset.parameters.map(parameter => parameter.name))
    );
    const supportedFields = new Set([
      ...getDeviceSettingsCapabilities(EDeviceType.Pro, 'V1').supportedFields,
      ...getDeviceSettingsCapabilities(EDeviceType.Pro2, 'V2').supportedFields,
    ]);

    supportedFields.forEach(name => expect(parameterNames.has(name)).toBe(true));
  });

  test('Pro2 Never 选项使用固件定义的线值', () => {
    const method = device.api.find(item => item.method === 'deviceSettings');
    const autoLock = method?.presets.find(
      item => item.title === 'Set Auto-lock Delay (Protocol V2)'
    );
    const autoShutdown = method?.presets.find(
      item => item.title === 'Set Auto-shutdown Delay (Protocol V2)'
    );

    expect(autoLock?.parameters[0]?.options).toContainEqual({
      label: 'Never',
      value: PROTOCOL_V2_NEVER_TIMEOUT_MS,
    });
    expect(autoShutdown?.parameters[0]?.options).toContainEqual({
      label: 'Never',
      value: PROTOCOL_V2_NEVER_TIMEOUT_MS,
    });
  });

  test('语言用例区分公共短代码与 Pro2 独有 BCP-47 标签', () => {
    const method = device.api.find(item => item.method === 'deviceSettings');
    const shared = method?.presets.find(item => item.title === 'Set language');
    const pro2 = method?.presets.find(
      item => item.title === 'Set Pro2-only language (Protocol V2)'
    );

    expect(shared?.parameters[0]?.options).toEqual(
      expect.arrayContaining([
        { label: 'English', value: 'en' },
        { label: '日本語', value: 'ja' },
        { label: 'Portuguese (Brazil)', value: 'pt_br' },
      ])
    );
    expect(pro2?.parameters[0]?.options).toEqual(
      expect.arrayContaining([
        { label: '繁體中文（台灣）', value: 'zh-Hant-TW' },
        { label: 'Tiếng Việt', value: 'vi-Latn-VN' },
      ])
    );
  });

  test('钱包会话只保留统一公开入口', () => {
    expect(device.api.some(item => item.method === 'openWalletSession')).toBe(true);
    expect(device.api.map(item => String(item.method))).not.toContain('deviceSessionOpen');
    expect(pro2Debug.api.map(item => String(item.method))).not.toContain('deviceSessionOpen');
  });

  test('统一读取方法同时提供默认实时状态和按需 scope', () => {
    const getMethod = device.api.find(item => item.method === 'getDeviceState');

    expect(getMethod?.presets.map(item => item.title)).toEqual([
      'Live runtime status',
      'Runtime and settings',
      'Runtime and firmware metadata',
    ]);
    expect(getMethod?.presets.map(item => item.parameters[0]?.value)).toEqual([
      undefined,
      'settings',
      'firmware',
    ]);
  });

  test('getFeatures 文案明确限制为 Protocol V1 兼容入口', () => {
    expect(en.translation.methodDescriptions.getFeatures).toContain(
      'Protocol V1 compatibility only'
    );
    expect(zh.translation.methodDescriptions.getFeatures).toContain('仅用于 Protocol V1 兼容');
    expect(en.translation.methodDescriptions.getOnekeyFeatures).toContain(
      'Protocol V1 compatibility only'
    );
    expect(zh.translation.methodDescriptions.getOnekeyFeatures).toContain(
      '仅用于 Protocol V1 兼容'
    );
  });

  test('钱包入口按协议拆分，并为 Protocol V2 提供三种会话模式', () => {
    const legacyMethod = device.api.find(item => item.method === 'getPassphraseState');
    const protocolV2Method = device.api.find(item => item.method === 'openWalletSession');

    expect(legacyMethod?.description).toContain('Protocol V1');
    expect(legacyMethod?.description).toContain('openWalletSession');
    expect(legacyMethod?.tags).toEqual(['Legacy', 'Protocol V1']);
    expect(legacyMethod?.presets).toEqual([
      {
        title: 'Get current wallet state (Legacy V1)',
        parameters: [],
      },
    ]);
    expect(protocolV2Method).toEqual(
      expect.objectContaining({
        noDeviceIdReq: true,
      })
    );
    expect(protocolV2Method?.supportedDevices).toBeUndefined();
    expect(protocolV2Method?.presets.map(item => item.title)).toEqual([
      'Open standard wallet',
      'Open hidden wallet',
      'Resume hidden wallet',
    ]);
    expect(protocolV2Method?.presets.map(item => item.parameters[0]?.value)).toEqual([
      'standard',
      'hidden',
      'resume-hidden',
    ]);
    expect(protocolV2Method?.presets[1]?.parameters.map(item => item.name)).toEqual([
      'mode',
      'access',
    ]);
    expect(protocolV2Method?.presets[1]?.parameters[1]?.value).toBe('passphrase');
    expect(protocolV2Method?.presets[1]?.parameters[1]?.options).toEqual([
      { label: 'Passphrase Hidden Wallet', value: 'passphrase' },
      { label: 'Attach-to-PIN Wallet', value: 'attach-pin' },
    ]);
    expect(protocolV2Method?.presets[2]?.parameters.map(item => item.name)).toEqual([
      'mode',
      'deviceId',
      'passphraseState',
    ]);
    expect(protocolV2Method?.presets[2]?.parameters[2]?.required).toBe(true);
  });

  test.each([
    'promptWebDeviceAccess',
    'getOnekeyFeatures',
    'getPassphraseState',
    'openWalletSession',
    'clearSessionCache',
    'testInitializeDeviceDuration',
    'preInitialize',
    'getDeviceState',
    'deviceGetOnboardingStatus',
  ])('将 %s 归入基础信息区', method => {
    expect(getDeviceMethodSection(method)).toBe('basic');
  });

  test.each([
    'deviceSettings',
    'deviceBackup',
    'deviceReset',
    'deviceRecovery',
    'deviceFlags',
    'deviceChangePin',
    'deviceLock',
    'deviceUnlock',
    'deviceCancel',
    'uploadPortfolio',
  ])('将 %s 归入设备操作区', method => {
    expect(getDeviceMethodSection(method)).toBe('device');
  });

  test('将底层钱包会话方法保留在高级调试区', () => {
    expect(getDeviceMethodSection('deviceSessionOpen')).toBe('advanced');
  });

  test.each([
    ['select', '{"passphrase_on_device":{}}', { passphrase_on_device: {} }],
    ['resume', '{"session_id":"session-1"}', { session_id: 'session-1' }],
  ])('将 %s 文本参数解析为 Protocol V2 请求对象', (name, value, expected) => {
    expect(parseParameterValue(name, value)).toEqual(expected);
  });
});
