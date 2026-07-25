import ClearSessionCache from '../src/api/ClearSessionCache';
import {
  DeviceWalletSessionStore,
  deviceWalletSessionStore,
} from '../src/device/DeviceWalletSessionStore';
import { Device } from '../src/device/Device';
import { createCoreApi } from '../src/inject';

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

  test('keeps pending sessions unreadable until wallet binding', () => {
    const store = new DeviceWalletSessionStore();
    store.setPending('device-1', 'pending-session');

    expect(store.get('device-1', undefined)).toBeUndefined();
    expect(store.getPending('device-1')).toBe('pending-session');
  });

  test('migrates descriptor keys to stable device ids', () => {
    const store = new DeviceWalletSessionStore();
    store.set('ble-path', 'hidden-a', 'session-a');
    store.setPending('ble-path', 'pending-session');

    store.migrateDeviceKey('ble-path', 'stable-device-id');

    expect(store.get('ble-path', 'hidden-a')).toBeUndefined();
    expect(store.get('stable-device-id', 'hidden-a')).toBe('session-a');
    expect(store.getPending('ble-path')).toBeUndefined();
    expect(store.getPending('stable-device-id')).toBe('pending-session');
  });

  test('clears one wallet, one device, or all sessions', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');
    store.set('device-1', 'hidden-b', 'session-b');
    store.set('device-2', 'hidden-a', 'session-c');

    store.delete('device-1', 'hidden-a');
    expect(store.get('device-1', 'hidden-a')).toBeUndefined();
    expect(store.get('device-1', 'hidden-b')).toBe('session-b');

    store.deleteDevice('device-1');
    expect(store.get('device-1', 'hidden-b')).toBeUndefined();
    expect(store.get('device-2', 'hidden-a')).toBe('session-c');

    store.clear();
    expect(store.get('device-2', 'hidden-a')).toBeUndefined();
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

  test('keeps legacy Features session fields as projections of the store', async () => {
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
    expect(device.features).toMatchObject({
      sessionId: 'session-a',
      session_id: 'session-a',
      passphraseState: 'hidden-a',
    });

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
    expect(device.state?.raw?.protocolV1Features).toMatchObject({
      sessionId: 'session-a',
      session_id: 'session-a',
    });
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
