import { describe, expect, test } from '@jest/globals';
import { getDeviceSettingsCapabilities } from '@onekeyfe/hd-core';
import { EDeviceType } from '@onekeyfe/hd-shared';

import { device } from './device';
import { getDeviceMethodSection, type DeviceMethodSection } from './deviceCategories';

describe('Device playground registry', () => {
  test('exposes the public device workflows restored from the workbench backup', () => {
    const methods = new Set<string>(device.api.map(item => item.method));

    [
      'promptWebDeviceAccess',
      'clearSessionCache',
      'testInitializeDeviceDuration',
      'preInitialize',
      'deviceBackup',
      'deviceReset',
      'deviceRecovery',
      'deviceFlags',
    ].forEach(method => expect(methods.has(method)).toBe(true));
  });

  test('keeps current protocol and state methods alongside restored methods', () => {
    const methods = new Set<string>(device.api.map(item => item.method));

    [
      'detectDeviceConnectProtocol',
      'getDeviceState',
      'openWalletSession',
      'testProtocolV2Ping',
    ].forEach(method => expect(methods.has(method)).toBe(true));
  });

  test('covers all public Pro V1 and Pro2 V2 settings fields', () => {
    const settings = device.api.find(item => item.method === 'deviceSettings');
    const parameterNames = new Set(
      settings?.presets.flatMap(preset => preset.parameters.map(parameter => parameter.name))
    );
    const supportedFields = new Set([
      ...getDeviceSettingsCapabilities(EDeviceType.Pro, 'V1').supportedFields,
      ...getDeviceSettingsCapabilities(EDeviceType.Pro2, 'V2').supportedFields,
    ]);

    supportedFields.forEach(field => expect(parameterNames.has(field)).toBe(true));
  });

  test.each<[string, DeviceMethodSection]>([
    ['promptWebDeviceAccess', 'basic'],
    ['clearSessionCache', 'basic'],
    ['deviceBackup', 'device'],
    ['deviceReset', 'device'],
    ['deviceReboot', 'firmware'],
    ['deviceWipe', 'advanced'],
  ])('places %s in the %s workbench section', (method, section) => {
    expect(getDeviceMethodSection(method)).toBe(section);
  });

  test('marks compatibility and destructive methods clearly', () => {
    expect(device.api.find(item => item.method === 'getFeatures')?.deprecated).toBe(true);
    expect(device.api.find(item => item.method === 'getOnekeyFeatures')?.deprecated).toBe(true);
    expect(device.api.find(item => item.method === 'deviceReset')?.tags).toContain('Destructive');
    expect(device.api.find(item => item.method === 'deviceWipe')?.tags).toContain('Destructive');
  });
});
