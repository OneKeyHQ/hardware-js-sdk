import { DeviceWalletSessionStore } from '../src/device/DeviceWalletSessionStore';

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
