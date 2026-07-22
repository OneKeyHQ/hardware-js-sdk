import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import basicMethods from '../data/basic';
import pro2Methods from '../data/pro2';
import { applyDeviceStateToExampleDevice } from './deviceStateAdapter';
import { getFirmwareDeviceStateSummary } from './deviceUtils';

describe('Expo Example canonical device state', () => {
  test('hydrates a selected device from DeviceState', () => {
    const state = {
      identity: {
        deviceType: 'pro2',
        label: 'Desk wallet',
        bleName: 'OneKey Pro2 AB12',
      },
      status: {},
      settings: {},
      versions: {},
    };

    expect(
      applyDeviceStateToExampleDevice({ connectId: 'usb-path', name: 'USB device' }, state as never)
    ).toEqual({
      connectId: 'usb-path',
      name: 'OneKey Pro2 AB12',
      deviceType: 'pro2',
      deviceState: state,
    });
  });

  test('presents getDeviceState before the V1 compatibility API', () => {
    const stateIndex = basicMethods.findIndex(item => item.method === 'getDeviceState');
    const refreshIndex = basicMethods.findIndex(item => item.method === 'refreshDeviceState');
    const featuresIndex = basicMethods.findIndex(item => item.method === 'getFeatures');
    const features = basicMethods[featuresIndex];

    expect(stateIndex).toBeGreaterThanOrEqual(0);
    expect(refreshIndex).toBeGreaterThan(stateIndex);
    expect(stateIndex).toBeLessThan(featuresIndex);
    expect(features.description).toContain('Protocol V1 compatibility only');
    expect(basicMethods.some(item => item.method === 'getOnekeyFeatures')).toBe(false);
  });

  test('provides cached reads and semantic Pro2 refresh scopes', () => {
    const stateMethod = pro2Methods.find(item => item.method === 'getDeviceState');
    const refreshMethod = pro2Methods.find(item => item.method === 'refreshDeviceState');

    expect(stateMethod?.presupposes?.map(item => item.title)).toEqual(['Cached state']);
    expect(refreshMethod?.presupposes?.map(item => item.value.scope)).toEqual([
      'basic',
      'firmware',
      'settings',
      'runtime',
    ]);
  });

  test('uses DeviceState for the Pro2 firmware screen', () => {
    const source = readFileSync(resolve(__dirname, '../views/FirmwareScreen/index.tsx'), 'utf8');
    const summary = getFirmwareDeviceStateSummary({
      identity: { deviceType: 'pro2', serialNo: 'SERIAL' },
      status: {},
      settings: {},
      versions: { firmware: '1.2.3', bootloader: '2.0.0', board: null, ble: '3.0.0' },
      verification: { firmwareBuildId: 'build' },
    } as never);

    expect(source).toContain("nextState.protocol === 'V1'");
    expect(source).toContain("scope: 'firmware'");
    expect(summary).toMatchObject({
      deviceType: 'PRO2',
      serialNumber: 'SERIAL',
      firmwareVersion: '1.2.3-build',
      bootloaderVersion: '2.0.0',
      bleVersion: '3.0.0',
    });
  });
});
