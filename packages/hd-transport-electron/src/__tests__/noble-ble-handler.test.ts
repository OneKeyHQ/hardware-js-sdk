import { EventEmitter } from 'events';
import { EOneKeyBleMessageKeys, HardwareErrorCode } from '@onekeyfe/hd-shared';

import {
  NOBLE_BLE_CONNECTION_TIMEOUT_MS,
  NOBLE_BLE_TARGETED_SCAN_TIMEOUT_MS,
} from '../noble-ble-timeouts';

import type { WebContents } from 'electron';

type IpcHandler = (...args: unknown[]) => Promise<unknown> | unknown;

const createPeripheral = (id: string, localName?: string, serviceUuids = ['0001', 'fffd']) => ({
  id,
  state: 'disconnected',
  advertisement: {
    localName,
    serviceUuids,
  },
});

describe('Electron Noble BLE device discovery', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('allows enough time for a slow targeted scan and connection', () => {
    expect(NOBLE_BLE_TARGETED_SCAN_TIMEOUT_MS).toBe(5_000);
    expect(NOBLE_BLE_CONNECTION_TIMEOUT_MS).toBe(10_000);
  });

  test('maps macOS stale pairing failures without reclassifying generic connection errors', async () => {
    const { createNobleBleConnectionError } = await import('../noble-ble-handler');

    expect(
      createNobleBleConnectionError(
        new Error('CBErrorDomain:14 Peer removed pairing information on the device side')
      )
    ).toMatchObject({
      errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation,
    });
    expect(createNobleBleConnectionError(new Error('Encryption is insufficient'))).toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceBondError,
    });
    expect(createNobleBleConnectionError(new Error('connection failed'))).toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
  });

  test('keeps safe pacing by default and allows an explicit high-throughput bypass', async () => {
    const { resolveNobleBleWritePacingDelay } = await import('../noble-ble-handler');

    expect(resolveNobleBleWritePacingDelay()).toBe(5);
    expect(resolveNobleBleWritePacingDelay({ pacingDelayMs: 0 })).toBe(0);
    expect(resolveNobleBleWritePacingDelay({ pacingDelayMs: 3.8 })).toBe(3);
  });

  test('waits for Noble to stop scanning before enumeration resolves', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
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
    let stopScanningCallback: (() => void) | undefined;
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', createPeripheral('onekey-device', 'Pro2 A1B2'));
      resolveScanStarted();
    });
    noble.stopScanning = jest.fn(callback => {
      stopScanningCallback = callback;
    });

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

    let enumerationResolved = false;
    const devicesPromise = Promise.resolve(enumerate()).then(devices => {
      enumerationResolved = true;
      return devices;
    });
    await scanStarted;
    jest.advanceTimersByTime(5_000);
    await Promise.resolve();

    expect(noble.stopScanning).toHaveBeenCalledTimes(1);
    expect(enumerationResolved).toBe(false);

    stopScanningCallback?.();
    await expect(devicesPromise).resolves.toEqual([
      expect.objectContaining({ id: 'onekey-device' }),
    ]);
  });

  test('waits for a targeted scan to stop before connecting', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
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
    let stopScanningCallback: (() => void) | undefined;
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('target-device', 'Pro2 A1B2'),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          callback(new Error('expected test connection failure'));
        }),
      }
    );
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', peripheral);
      resolveScanStarted();
    });
    noble.stopScanning = jest.fn(callback => {
      stopScanningCallback = callback;
    });

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

    const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
    if (!connect) {
      throw new Error('Electron Noble BLE connect handler was not registered');
    }

    const connectPromise = Promise.resolve(connect(undefined, 'target-device'));
    await scanStarted;

    expect(noble.startScanning).toHaveBeenCalledWith([], true, expect.any(Function));
    expect(noble.stopScanning).toHaveBeenCalledTimes(1);
    expect(peripheral.connect).not.toHaveBeenCalled();

    stopScanningCallback?.();
    await expect(connectPromise).rejects.toThrow('expected test connection failure');
    expect(peripheral.connect).toHaveBeenCalledTimes(1);
  });

  test('disconnects a connection callback that arrives after timeout', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
    const noble = new EventEmitter() as EventEmitter & {
      state: string;
      startScanning: jest.Mock;
      stopScanning: jest.Mock;
    };
    let connectCallback: ((error?: Error) => void) | undefined;
    let resolveConnectStarted = () => undefined;
    const connectStarted = new Promise<void>(resolve => {
      resolveConnectStarted = resolve;
    });
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('slow-device', 'Pro2 A1B2'),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          connectCallback = callback;
          resolveConnectStarted();
        }),
        disconnect: jest.fn((callback: () => void) => callback()),
      }
    );
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', peripheral);
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

    const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
    if (!connect) {
      throw new Error('Electron Noble BLE connect handler was not registered');
    }

    const connectPromise = Promise.resolve(connect(undefined, 'slow-device'));
    await connectStarted;
    expect(peripheral.connect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(NOBLE_BLE_CONNECTION_TIMEOUT_MS);
    await expect(connectPromise).rejects.toThrow('Connection timeout');

    connectCallback?.();
    await Promise.resolve();
    expect(peripheral.disconnect).toHaveBeenCalledTimes(1);
  });

  test('enumerates a Pro2 communication advertisement after Find My changes its name', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
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
      noble.emit('discover', createPeripheral('find-my-device', 'Pro2 A1B2 - Find My', ['fffd']));
      noble.emit('discover', createPeripheral('onekey-device', 'Pro2 A1B2 - Find My'));
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
    expect(noble.startScanning).toHaveBeenCalledWith([], true, expect.any(Function));
    jest.advanceTimersByTime(5000);

    await expect(devicesPromise).resolves.toEqual([
      expect.objectContaining({
        id: 'onekey-device',
        name: 'Pro2 A1B2 - Find My',
      }),
    ]);
  });

  test('accepts a communication peripheral after its scan response gains a name', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
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
        id: 'find-my-device',
        name: 'Pro2 A1B2 - Find My',
      }),
      expect.objectContaining({
        id: 'onekey-device',
        name: 'Pro2 A1B2',
      }),
    ]);
  });
});
