import { describe, expect, test } from '@jest/globals';

import { device } from './device';
import { getDeviceMethodSection } from './deviceCategories';
import { parseParameterValue } from '../../utils/parameterUtils';
import { en } from '../../i18n/locales/en';
import { zh } from '../../i18n/locales/zh';

describe('Pro2 设备方法配置', () => {
  test('公开统一状态、解锁、初始化状态和钱包会话方法', () => {
    const methods = new Set(device.api.map(item => item.method));

    expect(methods.has('deviceUnlock')).toBe(true);
    expect(methods.has('getDeviceState')).toBe(true);
    expect(methods.has('refreshDeviceState' as never)).toBe(false);
    expect(methods.has('deviceGetOnboardingStatus')).toBe(true);
    expect(methods.has('deviceSessionOpen')).toBe(true);
  });

  test('钱包会话方法覆盖所有原生选择、恢复和无效会话测试', () => {
    const method = device.api.find(item => item.method === 'deviceSessionOpen');

    expect(method?.presets.map(item => item.title)).toEqual([
      'Open hidden wallet on device',
      'Open hidden wallet with host passphrase',
      'Open hidden wallet with Attach PIN',
      'Resume wallet session',
      'Test invalid wallet session',
    ]);
    expect(method?.presets[1]?.parameters[0]?.value).toEqual({
      host_passphrase: { passphrase: '' },
    });
    expect(method?.presets[2]?.parameters[0]?.value).toEqual({ attach_pin_on_device: {} });
    expect(method?.presets[4]?.parameters[0]?.value).toEqual({ session_id: 'invalid-session-id' });
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

  test.each(['getDeviceState', 'deviceGetOnboardingStatus'])('将 %s 归入基础信息区', method => {
    expect(getDeviceMethodSection(method)).toBe('basic');
  });

  test.each([
    'deviceSettings',
    'deviceSettingsSet',
    'deviceSettingsPageShow',
    'deviceChangePin',
    'deviceLock',
    'deviceUnlock',
    'deviceCancel',
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
