import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { DeviceStateStore, createEmptyDeviceState } from '../src/device/DeviceStateStore';

describe('DeviceStateStore', () => {
  test('merges identity patches and ignores undefined', () => {
    const store = new DeviceStateStore(
      createEmptyDeviceState({
        deviceType: EDeviceType.Pro2,
        firmwareType: EFirmwareType.Universal,
      })
    );

    store.update({ identity: { bleName: 'Pro2 1234', label: null } }, 'initialize');
    const result = store.update(
      { identity: { label: 'My Wallet', bleName: undefined } },
      'settings-write'
    );

    expect(result.state.identity).toMatchObject({
      label: 'My Wallet',
      bleName: 'Pro2 1234',
    });
    expect(result.revision).toBe(2);
    expect(result.changedKeys).toContain('identity.label');
  });

  test('does not advance revision when the patch has no real changes', () => {
    const store = new DeviceStateStore(createEmptyDeviceState());
    const first = store.update({ status: { unlocked: null } }, 'device-status');
    const second = store.update({ status: { unlocked: null } }, 'device-status');

    expect(first.revision).toBe(0);
    expect(second.revision).toBe(0);
    expect(second.changedKeys).toEqual([]);
  });

  test('stores the wire protocol version independently from the protocol family', () => {
    const store = new DeviceStateStore(createEmptyDeviceState());

    const result = store.update({ protocol: 'V2', protocolVersion: 7 }, 'device-info');

    expect(result.state.protocol).toBe('V2');
    expect(result.state.protocolVersion).toBe(7);
    expect(result.changedKeys).toContain('protocolVersion');
  });

  test('merges raw protocol sources instead of replacing the previous source', () => {
    const store = new DeviceStateStore(createEmptyDeviceState());
    const deviceInfo = { protocol_version: 2, hw: { serial_no: 'SERIAL-1' } };
    const deviceStatus = { device_id: 'DEVICE-1', unlocked: true };

    store.update({ raw: { protocolV2DeviceInfo: deviceInfo } }, 'device-info');
    const result = store.update({ raw: { protocolV2DeviceStatus: deviceStatus } }, 'device-status');

    expect(result.state.raw).toEqual({
      protocolV2DeviceInfo: deviceInfo,
      protocolV2DeviceStatus: deviceStatus,
    });
  });

  test('removes only the explicitly cleared raw protocol source', () => {
    const store = new DeviceStateStore(createEmptyDeviceState());
    const deviceInfo = { protocol_version: 2, hw: { serial_no: 'SERIAL-1' } };
    const deviceStatus = { device_id: 'DEVICE-1', unlocked: true };

    store.update(
      {
        raw: {
          protocolV2DeviceInfo: deviceInfo,
          protocolV2DeviceStatus: deviceStatus,
        },
      },
      'initialize'
    );
    const result = store.update({ raw: { protocolV2DeviceStatus: null } }, 'device-info');

    expect(result.state.raw).toEqual({
      protocolV2DeviceInfo: deviceInfo,
    });
  });
});
