import { TRANSPORT_EVENT } from '@onekeyfe/hd-transport';

import { initConnector, initCore } from '../src/core';
import { DataManager } from '../src/data-manager';
import TransportManager from '../src/data-manager/TransportManager';
import { Device } from '../src/device/Device';
import { DevicePool } from '../src/device/DevicePool';
import { CORE_EVENT, DEVICE, IFRAME } from '../src/events';

import type Core from '../src/core';
import type { CoreMessage } from '../src/events';
import type { KnownDevice } from '../src/types';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

const createInitializedDevice = (protocol: 'V1' | 'V2') => {
  const device = Device.fromDescriptor({
    id: 'ble-discovery-id',
    path: 'ble-discovery-id',
    commType: 'ble',
    protocolType: protocol,
  } as never);
  device.mainId = 'ble-connect-id';
  device.features = {
    protocol,
    deviceType: protocol === 'V2' ? 'pro2' : 'classic',
    firmwareType: 'universal',
    deviceId: 'wallet-device-id',
    serialNo: 'SERIAL-001',
    label: 'OneKey Test',
    bleName: 'OneKey Test BLE',
    capabilities: [],
    mode: 'normal',
    initialized: true,
    bootloaderMode: false,
    firmwareVersion: '1.2.3',
    bootloaderVersion: '1.0.0',
    boardVersion: '1.0.0',
    bleVersion: '2.3.4',
  } as never;
  return device;
};

describe('public device lifecycle events', () => {
  let core: Core | undefined;

  beforeEach(() => {
    DevicePool.resetState();
    jest.spyOn(TransportManager, 'load').mockImplementation();
    TransportManager.transport = {
      stop: jest.fn().mockResolvedValue(undefined),
    } as never;
  });

  afterEach(async () => {
    await core?.dispose();
    core = undefined;
    jest.restoreAllMocks();
  });

  test('registers the shared device lifecycle listeners exactly once', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    core = initCore();
    initConnector();

    for (const id of ['first-call', 'second-call']) {
      await core.handleMessage({
        id,
        event: IFRAME.CALL,
        type: IFRAME.CALL,
        payload: { method: 'clearSessionCache' },
      } as CoreMessage);
    }

    expect(DevicePool.emitter.listenerCount(DEVICE.CONNECT)).toBe(1);
    expect(DevicePool.emitter.listenerCount(DEVICE.DISCONNECT)).toBe(1);
  });

  test('keeps shared device lifecycle listeners across a device cache reset', () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    core = initCore();
    initConnector();
    const messages: CoreMessage[] = [];
    core.on(CORE_EVENT, message => messages.push(message));
    const device = createInitializedDevice('V2');

    DevicePool.resetState();
    DevicePool.emitter.emit(DEVICE.CONNECT, device);
    DevicePool.emitter.emit(DEVICE.DISCONNECT, device);

    expect(messages.filter(message => message.type === DEVICE.CONNECT)).toHaveLength(1);
    expect(messages.filter(message => message.type === DEVICE.DISCONNECT)).toHaveLength(1);
  });

  test('converts an internal transport disconnect into a public KnownDevice snapshot', () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    core = initCore();
    initConnector();
    const messages: CoreMessage[] = [];
    core.on(CORE_EVENT, message => messages.push(message));
    const device = createInitializedDevice('V2');
    DevicePool.devicesCache['ble-connect-id'] = device;

    DevicePool.emitter.emit(TRANSPORT_EVENT.DEVICE_DISCONNECT, {
      id: 'ble-connect-id',
      connectId: 'ble-connect-id',
      name: 'OneKey Test BLE',
    });

    const disconnectMessage = messages.find(message => message.type === DEVICE.DISCONNECT);
    expect(disconnectMessage?.payload.device).toMatchObject({
      connectId: 'ble-connect-id',
      serialNo: 'SERIAL-001',
      state: { protocol: 'V2' },
    });
    expect(() => JSON.stringify(disconnectMessage?.payload.device)).not.toThrow();
  });

  test('treats an acquired BLE device as reusable until the transport disconnects', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('desktop-web-ble' as never);
    const device = createInitializedDevice('V2');
    const acquire = jest.spyOn(device, 'acquire').mockResolvedValue(undefined);
    (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;
    (device as any).commands = { disposed: false };

    expect(device.isUsedHere()).toBe(true);
    await expect(device.connect('V2')).resolves.toBe(true);
    expect(acquire).not.toHaveBeenCalled();

    device.markTransportDisconnected();
    expect(device.isUsedHere()).toBe(false);
  });

  test('exposes the current transport usage state in public device snapshots', () => {
    const getSettings = jest
      .spyOn(DataManager, 'getSettings')
      .mockReturnValue('desktop-web-ble' as never);
    const device = createInitializedDevice('V2');

    expect(device.toMessageObject()?.status).toBe('available');
    expect(device.toMessageObject()?.connectProtocol).toBe('V2');

    (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;
    expect(device.toMessageObject()?.status).toBe('used');

    device.markTransportDisconnected();
    expect(device.toMessageObject()?.status).toBe('available');

    getSettings.mockReturnValue('web' as never);
    device.originalDescriptor.session = 'external-session';
    expect(device.toMessageObject()?.status).toBe('occupied');
  });

  test.each([
    ['react-native', 'V1'],
    ['react-native', 'V2'],
    ['lowlevel', 'V1'],
    ['lowlevel', 'V2'],
  ] as const)(
    'emits KnownDevice snapshots for %s Protocol %s connect and disconnect events',
    async (env, protocol) => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(env as never);
      core = initCore();
      initConnector();

      await core.handleMessage({
        id: 'register-device-connect-listener',
        event: IFRAME.CALL,
        type: IFRAME.CALL,
        payload: { method: 'clearSessionCache' },
      } as CoreMessage);

      const messages: CoreMessage[] = [];
      core.on(CORE_EVENT, message => messages.push(message));
      const internalDevice = createInitializedDevice(protocol);

      DevicePool.emitter.emit(DEVICE.CONNECT, internalDevice);
      internalDevice.updateState({ identity: { label: 'Updated label' } }, 'settings-write');
      DevicePool.emitter.emit(DEVICE.DISCONNECT, internalDevice);

      const connectMessage = messages.find(message => message.type === DEVICE.CONNECT);
      const disconnectMessage = messages.find(message => message.type === DEVICE.DISCONNECT);
      const connectedDevice = connectMessage?.payload.device as KnownDevice;
      const disconnectedDevice = disconnectMessage?.payload.device as KnownDevice;

      expect(connectedDevice).toMatchObject({
        connectId: 'ble-connect-id',
        serialNo: 'SERIAL-001',
        uuid: 'SERIAL-001',
        status: 'available',
        label: 'OneKey Test',
        state: { protocol },
      });
      expect(disconnectedDevice).toMatchObject({
        connectId: 'ble-connect-id',
        serialNo: 'SERIAL-001',
        uuid: 'SERIAL-001',
        status: 'available',
        label: 'Updated label',
        state: { protocol },
      });
      expect(connectedDevice).not.toBe(internalDevice);
      expect(connectedDevice).not.toBe(disconnectedDevice);
      expect(connectedDevice).not.toHaveProperty('run');
      expect(connectedDevice).not.toHaveProperty('acquire');
      expect(connectedDevice).not.toHaveProperty('commands');
      expect(() => JSON.stringify(connectedDevice)).not.toThrow();
      expect(connectedDevice.label).toBe('OneKey Test');
    }
  );
});
