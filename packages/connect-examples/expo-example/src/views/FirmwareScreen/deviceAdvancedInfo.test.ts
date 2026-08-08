import { buildDeviceAdvancedInfo } from './deviceAdvancedInfo';

import type { DeviceState } from '@onekeyfe/hd-core';

const createState = (overrides: Partial<DeviceState> = {}): DeviceState =>
  ({
    schemaVersion: 1,
    revision: 1,
    updatedAt: 1,
    protocol: 'V2',
    protocolVersion: 2,
    identity: {
      deviceType: 'pro2',
      firmwareType: 'universal',
      model: 'Pro 2',
      vendor: 'onekey.so',
      deviceId: 'device-id',
      serialNo: 'serial-no',
      label: null,
      bleName: 'OneKey Pro 2',
    },
    status: {} as DeviceState['status'],
    settings: {} as DeviceState['settings'],
    versions: {
      firmware: '1.2.0',
      applicationP1: '1.2.0',
      applicationP2: '1.1.0',
      bootloader: '1.0.0',
      board: '1.0.0',
      ble: '2.0.0',
      se01: '1.0.0',
      se02: '1.0.0',
    },
    capabilities: [],
    verification: {
      applicationP1BuildId: 'app-p1',
      applicationP2BuildId: 'app-p2',
      se01BuildId: 'se01-app',
      se02BuildId: 'se02-app',
    },
    securityElements: {
      se01: { type: 'SE', state: 'APP' },
      se02: { type: 'SE', state: 'APP' },
      se03: { type: null, state: null },
      se04: { type: null, state: null },
    },
    ...overrides,
  } as DeviceState);

describe('buildDeviceAdvancedInfo', () => {
  test('使用统一模型展示 Protocol V2 的 APP P1、APP P2 和实际存在的 SE', () => {
    const info = buildDeviceAdvancedInfo(createState());

    expect(info.deviceGroups.map(group => group.key)).toEqual([
      'identity',
      'board',
      'bootloader',
      'applicationP1',
      'applicationP2',
      'ble',
    ]);
    expect(info.securityElementGroups.map(group => group.key)).toEqual(['se01', 'se02']);
  });

  test('旧协议使用 Firmware 分组且不渲染不存在的组件', () => {
    const info = buildDeviceAdvancedInfo(
      createState({
        protocol: 'V1',
        protocolVersion: 1,
        identity: {
          ...createState().identity,
          bleName: null,
        },
        versions: {
          firmware: '4.10.0',
          bootloader: null,
          board: null,
          ble: null,
        },
        verification: { firmwareBuildId: 'legacy-firmware' },
        securityElements: undefined,
      })
    );

    expect(info.deviceGroups.map(group => group.key)).toEqual(['identity', 'firmware']);
    expect(info.securityElementGroups).toEqual([]);
  });
});
