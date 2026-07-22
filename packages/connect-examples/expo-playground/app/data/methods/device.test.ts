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
    expect(methods.has('refreshDeviceState')).toBe(true);
    expect(methods.has('deviceGetOnboardingStatus')).toBe(true);
    expect(methods.has('deviceSessionOpen')).toBe(true);
  });

  test('钱包会话方法只提供隐藏钱包和恢复会话预设', () => {
    const method = device.api.find(item => item.method === 'deviceSessionOpen');

    expect(method?.presets.map(item => item.title)).toEqual([
      'Open hidden wallet on device',
      'Resume wallet session',
    ]);
  });

  test('读取方法只展示缓存，刷新方法使用业务 scope', () => {
    const getMethod = device.api.find(item => item.method === 'getDeviceState');
    const refreshMethod = device.api.find(item => item.method === 'refreshDeviceState');

    expect(getMethod?.presets.map(item => item.title)).toEqual(['Cached state']);
    expect(refreshMethod?.presets.map(item => item.parameters[0]?.value)).toEqual([
      'basic',
      'firmware',
      'settings',
      'runtime',
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

  test.each(['getDeviceState', 'refreshDeviceState', 'deviceGetOnboardingStatus'])(
    '将 %s 归入基础信息区',
    method => {
      expect(getDeviceMethodSection(method)).toBe('basic');
    }
  );

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
