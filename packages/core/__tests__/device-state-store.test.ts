import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { DeviceStateStore, createEmptyDeviceState } from '../src/device/DeviceStateStore';

describe('DeviceStateStore', () => {
  test('merges patches, ignores undefined and recomputes displayName', () => {
    const store = new DeviceStateStore(
      createEmptyDeviceState({
        deviceType: EDeviceType.Pro2,
        firmwareType: EFirmwareType.Universal,
      })
    );

    store.update({ identity: { bleName: 'Pro2 1234', label: null } }, 'initialize');
    const result = store.update(
      { identity: { label: 'My Wallet', bleName: undefined } },
      'apply-settings'
    );

    expect(result.state.identity).toMatchObject({
      label: 'My Wallet',
      bleName: 'Pro2 1234',
      displayName: 'My Wallet',
    });
    expect(result.revision).toBe(2);
    expect(result.changedKeys).toContain('identity.label');
    expect(result.changedKeys).toContain('identity.displayName');
  });

  test('does not advance revision when the patch has no real changes', () => {
    const store = new DeviceStateStore(createEmptyDeviceState());
    const first = store.update({ status: { unlocked: null } }, 'device-status');
    const second = store.update({ status: { unlocked: null } }, 'device-status');

    expect(first.revision).toBe(0);
    expect(second.revision).toBe(0);
    expect(second.changedKeys).toEqual([]);
  });

  test('clears only ephemeral session state', () => {
    const store = new DeviceStateStore(createEmptyDeviceState());
    store.update(
      {
        identity: { label: 'Kept' },
        session: { sessionId: 'session-1', passphraseState: 'state-1' },
      },
      'initialize'
    );

    const result = store.clearSession('transport-reconnect');

    expect(result?.state.identity.label).toBe('Kept');
    expect(result?.state.session).toBeUndefined();
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

  test.each([
    [EDeviceType.Classic1s, 'OneKey Classic 1S'],
    [EDeviceType.ClassicPure, 'OneKey Classic 1S Pure'],
    [EDeviceType.Touch, 'OneKey Touch'],
    [EDeviceType.Pro, 'OneKey Pro'],
    [EDeviceType.Pro2, 'OneKey Pro 2'],
  ] as const)(
    'uses the product display name for %s when label and BLE name are absent',
    (type, name) => {
      const state = createEmptyDeviceState({ deviceType: type });

      expect(state.identity.displayName).toBe(name);
    }
  );
});
