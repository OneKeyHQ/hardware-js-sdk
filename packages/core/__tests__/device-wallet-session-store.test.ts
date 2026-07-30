import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import ClearSessionCache from '../src/api/ClearSessionCache';
import DeviceWipe from '../src/api/device/DeviceWipe';
import {
  DeviceWalletSessionStore,
  deviceWalletSessionStore,
} from '../src/device/DeviceWalletSessionStore';
import { Device } from '../src/device/Device';
import { createCoreApi } from '../src/inject';
import TransportManager from '../src/data-manager/TransportManager';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('DeviceWalletSessionStore', () => {
  test('requires passphraseState for wallet session lookup', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');

    expect(store.get('device-1', undefined)).toBeUndefined();
    expect(store.get('device-1', 'hidden-a')).toBe('session-a');
  });

  test('isolates wallets and devices', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');
    store.set('device-1', 'hidden-b', 'session-b');
    store.set('device-2', 'hidden-a', 'session-c');

    expect(store.get('device-1', 'hidden-a')).toBe('session-a');
    expect(store.get('device-1', 'hidden-b')).toBe('session-b');
    expect(store.get('device-2', 'hidden-a')).toBe('session-c');
  });

  test('evicts the oldest wallet session when a device exceeds the SE capacity of three', () => {
    const store = new DeviceWalletSessionStore();
    store.setStandard('device-1', 'wallet-a', 'session-a');
    store.set('device-1', 'wallet-b', 'session-b');
    store.set('device-1', 'wallet-c', 'session-c');
    store.set('device-1', 'wallet-d', 'session-d');

    expect(store.get('device-1', 'wallet-a')).toBeUndefined();
    expect(store.getStandard('device-1')).toBeUndefined();
    expect(store.get('device-1', 'wallet-b')).toBe('session-b');
    expect(store.get('device-1', 'wallet-c')).toBe('session-c');
    expect(store.get('device-1', 'wallet-d')).toBe('session-d');
  });

  test('indexes the standard wallet without replacing hidden-wallet sessions', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'hidden-session-a');

    store.setStandard('device-1', 'standard-state', 'standard-session-1');
    store.setStandard('device-1', 'standard-state', 'standard-session-2');

    expect(store.getStandard('device-1')).toEqual({
      passphraseState: 'standard-state',
      sessionId: 'standard-session-2',
    });
    expect(store.get('device-1', 'standard-state')).toBe('standard-session-2');
    expect(store.get('device-1', 'hidden-a')).toBe('hidden-session-a');
  });

  test('keeps pending sessions unreadable until wallet binding', () => {
    const store = new DeviceWalletSessionStore();
    store.setPending('device-1', 'pending-session');

    expect(store.get('device-1', undefined)).toBeUndefined();
    expect(store.getPending('device-1')).toBe('pending-session');
  });

  test('migrates descriptor keys to stable device ids', () => {
    const store = new DeviceWalletSessionStore();
    store.set('ble-path', 'hidden-a', 'session-a');
    store.setStandard('ble-path', 'standard-state', 'standard-session');
    store.setPending('ble-path', 'pending-session');

    store.reconcileDeviceIdentity({
      temporaryKey: 'ble-path',
      nextDeviceId: 'stable-device-id',
    });

    expect(store.get('ble-path', 'hidden-a')).toBeUndefined();
    expect(store.get('stable-device-id', 'hidden-a')).toBe('session-a');
    expect(store.getStandard('ble-path')).toBeUndefined();
    expect(store.getStandard('stable-device-id')).toEqual({
      passphraseState: 'standard-state',
      sessionId: 'standard-session',
    });
    expect(store.getPending('ble-path')).toBeUndefined();
    expect(store.getPending('stable-device-id')).toBe('pending-session');
  });

  test('keeps the three-session limit when descriptor sessions merge into a stable device id', () => {
    const store = new DeviceWalletSessionStore();
    store.setStandard('stable-device-id', 'wallet-a', 'session-a');
    store.set('stable-device-id', 'wallet-b', 'session-b');
    store.set('ble-path', 'wallet-c', 'session-c');
    store.set('ble-path', 'wallet-d', 'session-d');

    store.reconcileDeviceIdentity({
      temporaryKey: 'ble-path',
      nextDeviceId: 'stable-device-id',
    });

    expect(store.get('stable-device-id', 'wallet-a')).toBeUndefined();
    expect(store.getStandard('stable-device-id')).toBeUndefined();
    expect(store.get('stable-device-id', 'wallet-b')).toBe('session-b');
    expect(store.get('stable-device-id', 'wallet-c')).toBe('session-c');
    expect(store.get('stable-device-id', 'wallet-d')).toBe('session-d');
  });

  test('drops sessions from an old stable identity without overwriting the new device', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-a', 'hidden-a', 'session-a');
    store.setPending('device-a', 'pending-a');
    store.set('device-b', 'hidden-a', 'session-b');
    store.setPending('device-b', 'pending-b');

    store.reconcileDeviceIdentity({
      temporaryKey: 'ble-path',
      previousDeviceId: 'device-a',
      nextDeviceId: 'device-b',
    });

    expect(store.get('device-a', 'hidden-a')).toBeUndefined();
    expect(store.getPending('device-a')).toBeUndefined();
    expect(store.get('device-b', 'hidden-a')).toBe('session-b');
    expect(store.getPending('device-b')).toBe('pending-b');
  });

  test('clears one wallet, one device, or all sessions', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');
    store.set('device-1', 'hidden-b', 'session-b');
    store.setStandard('device-1', 'standard-state', 'standard-session');
    store.set('device-2', 'hidden-a', 'session-c');

    store.delete('device-1', 'hidden-a');
    expect(store.get('device-1', 'hidden-a')).toBeUndefined();
    expect(store.get('device-1', 'hidden-b')).toBe('session-b');
    expect(store.getStandard('device-1')?.sessionId).toBe('standard-session');

    store.delete('device-1', 'standard-state');
    expect(store.getStandard('device-1')).toBeUndefined();

    store.deleteDevice('device-1');
    expect(store.get('device-1', 'hidden-b')).toBeUndefined();
    expect(store.get('device-2', 'hidden-a')).toBe('session-c');

    store.clear();
    expect(store.get('device-2', 'hidden-a')).toBeUndefined();
  });
});

describe('Device wipe lifecycle invalidation', () => {
  beforeEach(() => {
    deviceWalletSessionStore.clear();
  });

  test('clears the old Protocol V2 identity and wallet sessions after wipe succeeds', async () => {
    const device = Device.fromDescriptor({
      id: 'pro2-descriptor',
      path: 'pro2-path',
      protocolType: 'V2',
    } as never);
    device.features = {
      protocol: 'V2',
      deviceId: 'old-device-id',
      unlocked: true,
      passphraseProtection: true,
    } as never;
    device.passphraseState = 'hidden-a';
    deviceWalletSessionStore.set('old-device-id', 'hidden-a', 'old-session');
    deviceWalletSessionStore.set('pro2-path', 'hidden-a', 'temporary-session');
    device.markPreInitialized({ passphraseState: 'hidden-a' });
    device.commands = {
      typedCall: jest.fn().mockResolvedValue({ message: { message: 'accepted' } }),
    } as never;

    const method = new DeviceWipe({ id: 1, payload: { method: 'deviceWipe' } });
    method.init();
    (method as any).device = device;

    await expect(method.run()).resolves.toEqual({ message: 'accepted' });

    expect(device.features).toBeUndefined();
    expect(device.passphraseState).toBeUndefined();
    expect(device.needReloadDevice).toBe(true);
    expect(device.isPreInitializedValid(60_000)).toBe(false);
    expect(deviceWalletSessionStore.get('old-device-id', 'hidden-a')).toBeUndefined();
    expect(deviceWalletSessionStore.get('pro2-path', 'hidden-a')).toBeUndefined();
  });
});

describe('ClearSessionCache', () => {
  beforeEach(() => {
    deviceWalletSessionStore.clear();
  });

  test('uses DeviceWalletSessionStore as the only cache source', async () => {
    deviceWalletSessionStore.set('device-1', 'hidden-a', 'session-a');
    deviceWalletSessionStore.set('device-2', 'hidden-a', 'session-b');

    const method = new ClearSessionCache({
      payload: {
        method: 'clearSessionCache',
        deviceId: 'device-1',
        passphraseState: 'hidden-a',
      },
    });
    method.init();
    await method.run();

    expect(deviceWalletSessionStore.get('device-1', 'hidden-a')).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-2', 'hidden-a')).toBe('session-b');
  });

  test('rejects passphraseState without a deviceId instead of clearing every device', () => {
    deviceWalletSessionStore.set('device-1', 'hidden-a', 'session-a');
    deviceWalletSessionStore.set('device-2', 'hidden-a', 'session-b');
    const method = new ClearSessionCache({
      payload: { method: 'clearSessionCache', passphraseState: 'hidden-a' },
    });

    expect(() => method.init()).toThrow('Parameter [deviceId] is required with [passphraseState].');
    expect(deviceWalletSessionStore.get('device-1', 'hidden-a')).toBe('session-a');
    expect(deviceWalletSessionStore.get('device-2', 'hidden-a')).toBe('session-b');
  });

  test('keeps wallet sessions internal instead of projecting them through Features', async () => {
    const device = Device.fromDescriptor({ id: 'one', path: 'one' } as never);
    device.features = {
      protocol: 'V1',
      deviceId: 'device-1',
      passphraseState: 'hidden-a',
      sessionId: 'session-a',
      session_id: 'session-a',
      raw: {
        protocolV1Features: {
          sessionId: 'session-a',
          session_id: 'session-a',
        },
      },
    } as never;

    expect(device.state).not.toHaveProperty('session');
    expect(device.getInternalState()).toBe('session-a');
    expect(device.features).toMatchObject({
      sessionId: null,
      session_id: null,
    });
    expect(device.features).not.toHaveProperty('passphraseState');
    expect(device.features).not.toHaveProperty('raw');

    const method = new ClearSessionCache({
      payload: {
        method: 'clearSessionCache',
        deviceId: 'device-1',
        passphraseState: 'hidden-a',
      },
    });
    method.init();
    await method.run();

    expect(device.features?.sessionId).toBeNull();
    expect(device.features?.session_id).toBeNull();
    expect(device.state?.raw?.protocolV1Features).not.toHaveProperty('sessionId');
    expect(device.state?.raw?.protocolV1Features).not.toHaveProperty('session_id');
  });

  test('uses only the transport path as the temporary Protocol V2 cache key', () => {
    const device = Device.fromDescriptor({ id: 'descriptor-id' } as never);
    device.features = {
      protocol: 'V2',
      passphraseState: 'hidden-a',
      sessionId: 'session-a',
    } as never;

    expect(device.getInternalState()).toBeUndefined();
    expect(deviceWalletSessionStore.get('descriptor-id', 'hidden-a')).toBeUndefined();
  });

  test('clears one wallet without using a device', async () => {
    deviceWalletSessionStore.set('device-1', 'hidden-a', 'session-a');
    deviceWalletSessionStore.set('device-1', 'hidden-b', 'session-b');
    const method = new ClearSessionCache({
      payload: {
        method: 'clearSessionCache',
        deviceId: 'device-1',
        passphraseState: 'hidden-a',
      },
    });

    method.init();

    expect(method.useDevice).toBe(false);
    await expect(method.run()).resolves.toEqual({ cleared: true });
    expect(deviceWalletSessionStore.get('device-1', 'hidden-a')).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-1', 'hidden-b')).toBe('session-b');
  });

  test('clears one device or the full runtime store', async () => {
    deviceWalletSessionStore.set('device-1', 'hidden-a', 'session-a');
    deviceWalletSessionStore.set('device-2', 'hidden-a', 'session-b');

    const clearDevice = new ClearSessionCache({
      payload: { method: 'clearSessionCache', deviceId: 'device-1' },
    });
    clearDevice.init();
    await clearDevice.run();

    expect(deviceWalletSessionStore.get('device-1', 'hidden-a')).toBeUndefined();
    expect(deviceWalletSessionStore.get('device-2', 'hidden-a')).toBe('session-b');

    const clearAll = new ClearSessionCache({
      payload: { method: 'clearSessionCache' },
    });
    clearAll.init();
    await clearAll.run();

    expect(deviceWalletSessionStore.get('device-2', 'hidden-a')).toBeUndefined();
  });

  test('routes cache clearing through the active CoreApi call channel', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: { cleared: true } });
    const api = createCoreApi(call as any);

    await api.clearSessionCache({ deviceId: 'device-1', passphraseState: 'hidden-a' });

    expect(call).toHaveBeenCalledWith({
      method: 'clearSessionCache',
      deviceId: 'device-1',
      passphraseState: 'hidden-a',
    });
  });
});

describe('Protocol V1 wallet identity initialization', () => {
  beforeEach(() => {
    deviceWalletSessionStore.clear();
    jest.restoreAllMocks();
  });

  test('verifies the live device id before sending a cached wallet session', async () => {
    const device = Device.fromDescriptor({ id: 'connect-b', path: 'connect-b' } as never);
    device.features = {
      protocol: 'V1',
      deviceId: 'cached-device-a',
      unlocked: true,
      passphraseProtection: true,
    } as never;
    deviceWalletSessionStore.set('cached-device-a', 'hidden-a', 'session-a');
    const typedCall = jest.fn().mockResolvedValue({
      type: 'Features',
      message: { device_id: 'live-device-b' },
    });
    device.commands = { typedCall } as never;
    jest.spyOn(TransportManager, 'reconfigure').mockResolvedValue(undefined);

    await expect(
      device.initialize({ deviceId: 'cached-device-a', passphraseState: 'hidden-a' })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceCheckDeviceIdError });
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith(
      'Initialize',
      'Features',
      expect.not.objectContaining({ session_id: 'session-a' }),
      expect.any(Object)
    );
  });

  test('resumes a cached V1 wallet only after the live device id matches', async () => {
    const device = Device.fromDescriptor({ id: 'connect-a', path: 'connect-a' } as never);
    device.features = {
      protocol: 'V1',
      deviceId: 'device-a',
      unlocked: true,
      passphraseProtection: true,
    } as never;
    deviceWalletSessionStore.set('device-a', 'hidden-a', 'session-a');
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'Features', message: { device_id: 'device-a' } })
      .mockResolvedValueOnce({
        type: 'Features',
        message: { device_id: 'device-a', session_id: 'session-a' },
      });
    device.commands = { typedCall } as never;
    jest.spyOn(TransportManager, 'reconfigure').mockResolvedValue(undefined);

    await device.initialize({ deviceId: 'device-a', passphraseState: 'hidden-a' });

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'Initialize',
      'Features',
      expect.not.objectContaining({ session_id: 'session-a' }),
      expect.any(Object)
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'Initialize',
      'Features',
      expect.objectContaining({
        session_id: 'session-a',
        passphrase_state: 'hidden-a',
      }),
      expect.any(Object)
    );
  });
});
