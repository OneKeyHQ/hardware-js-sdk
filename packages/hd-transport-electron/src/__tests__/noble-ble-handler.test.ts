import { EventEmitter } from 'events';
import { EOneKeyBleMessageKeys } from '@onekeyfe/hd-shared';

import type { WebContents } from 'electron';

type IpcHandler = (...args: unknown[]) => Promise<unknown> | unknown;

const createPeripheral = (id: string, localName?: string) => ({
  id,
  state: 'disconnected',
  advertisement: {
    localName,
    serviceUuids: ['0001', 'fffd'],
  },
});

describe('Electron Noble BLE device discovery', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('does not enumerate a Pro2 Find My advertisement with the communication service', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
    };
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    let resolveScanStarted = () => undefined;
    const scanStarted = new Promise<void>(resolve => {
      resolveScanStarted = resolve;
    });
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', createPeripheral('find-my-device', 'Pro2 A1B2 - Find My'));
      noble.emit('discover', createPeripheral('onekey-device', 'Pro2 A1B2'));
      resolveScanStarted();
    });
    noble.stopScanning = jest.fn(callback => callback?.());

    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock('electron', () => ({ ipcMain }));
    jest.doMock('electron-log', () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }));

    const { setupNobleBleHandlers } = await import('../noble-ble-handler');
    setupNobleBleHandlers({
      on: jest.fn(),
      send: jest.fn(),
    } as unknown as WebContents);

    const enumerate = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE);
    if (!enumerate) {
      throw new Error('Electron Noble BLE enumerate handler was not registered');
    }

    const devicesPromise = Promise.resolve(enumerate());
    await scanStarted;
    jest.advanceTimersByTime(5000);

    await expect(devicesPromise).resolves.toEqual([
      expect.objectContaining({
        id: 'onekey-device',
        name: 'Pro2 A1B2',
      }),
    ]);
  });

  test('does not enumerate a Find My peripheral first discovered without a name', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
    };
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    let resolveScanStarted = () => undefined;
    const scanStarted = new Promise<void>(resolve => {
      resolveScanStarted = resolve;
    });
    const findMyPeripheral = createPeripheral('find-my-device');
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', findMyPeripheral);
      findMyPeripheral.advertisement.localName = 'Pro2 A1B2 - Find My';
      noble.emit('discover', findMyPeripheral);
      noble.emit('discover', createPeripheral('onekey-device', 'Pro2 A1B2'));
      resolveScanStarted();
    });
    noble.stopScanning = jest.fn(callback => callback?.());

    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock('electron', () => ({ ipcMain }));
    jest.doMock('electron-log', () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }));

    const { setupNobleBleHandlers } = await import('../noble-ble-handler');
    setupNobleBleHandlers({
      on: jest.fn(),
      send: jest.fn(),
    } as unknown as WebContents);

    const enumerate = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE);
    if (!enumerate) {
      throw new Error('Electron Noble BLE enumerate handler was not registered');
    }

    const devicesPromise = Promise.resolve(enumerate());
    await scanStarted;
    jest.advanceTimersByTime(5000);

    await expect(devicesPromise).resolves.toEqual([
      expect.objectContaining({
        id: 'onekey-device',
        name: 'Pro2 A1B2',
      }),
    ]);
  });
});
