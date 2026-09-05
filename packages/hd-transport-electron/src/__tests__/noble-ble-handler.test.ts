import { EventEmitter } from 'events';
import { EOneKeyBleMessageKeys, HardwareErrorCode } from '@onekeyfe/hd-shared';

import {
  NOBLE_BLE_SUBSCRIBE_TIMEOUT_MS,
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

  test('bounds targeted scans and subscription callbacks independently', () => {
    expect(NOBLE_BLE_TARGETED_SCAN_TIMEOUT_MS).toBe(5_000);
    expect(NOBLE_BLE_SUBSCRIBE_TIMEOUT_MS).toBe(10_000);
  });

  test('maps structured macOS stale pairing failures without parsing localized text', async () => {
    const { createNobleBleConnectionError } = await import('../noble-ble-handler');

    const staleBondError = createNobleBleConnectionError(
      Object.assign(new Error('Peer removed pairing information on the device side'), {
        nativeErrorCode: 14,
        nativeErrorDomain: 'CBErrorDomain',
      })
    );
    expect(staleBondError).toMatchObject({
      errorCode: HardwareErrorCode.BleBondInvalid,
      params: {
        nativeErrorMessage: 'Peer removed pairing information on the device side',
      },
    });
    expect(staleBondError.message).toContain('Peer removed pairing information on the device side');
    expect(createNobleBleConnectionError(new Error('Encryption is insufficient'))).toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(
      createNobleBleConnectionError(
        Object.assign(new Error('localized native message'), {
          nativeErrorCode: 14,
          nativeErrorDomain: 'CBATTErrorDomain',
        })
      )
    ).toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(
      createNobleBleConnectionError(
        Object.assign(new Error('Encryption is insufficient'), {
          nativeErrorCode: 15,
          nativeErrorDomain: 'CBATTErrorDomain',
        })
      )
    ).toMatchObject({
      errorCode: HardwareErrorCode.BleBondInvalid,
    });
    expect(createNobleBleConnectionError(new Error('connection failed'))).toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
  });

  test('serializes HardwareError fields for the Noble IPC boundary', async () => {
    const { createNobleBleIpcErrorResponse } = await import('../noble-ble-handler');

    expect(
      createNobleBleIpcErrorResponse({
        name: 'HardwareError',
        message: 'Bluetooth pairing information is no longer valid',
        errorCode: HardwareErrorCode.BleBondInvalid,
        params: { nativeErrorMessage: 'native message' },
      })
    ).toEqual({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        name: 'HardwareError',
        message: 'Bluetooth pairing information is no longer valid',
        errorCode: HardwareErrorCode.BleBondInvalid,
        params: { nativeErrorMessage: 'native message' },
      },
    });

    expect(createNobleBleIpcErrorResponse(new Error('untyped failure'))).toEqual({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        name: 'Error',
        message: 'untyped failure',
        errorCode: HardwareErrorCode.UnknownError,
      },
    });

    const circularParams: { self?: unknown } = {};
    circularParams.self = circularParams;
    expect(
      createNobleBleIpcErrorResponse({
        message: 'failure with unsafe params',
        errorCode: HardwareErrorCode.BleConnectedError,
        params: circularParams,
      })
    ).toEqual({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        name: 'Error',
        message: 'failure with unsafe params',
        errorCode: HardwareErrorCode.BleConnectedError,
      },
    });
  });

  test('rejects a structured Noble IPC failure at the preload boundary', async () => {
    const { invokeNobleBleIpc } = await import('../types/desktop-api');

    await expect(
      invokeNobleBleIpc(
        Promise.resolve({
          type: 'NobleBleIpcError' as const,
          success: false as const,
          error: {
            name: 'HardwareError',
            message: 'Bluetooth pairing information is no longer valid',
            errorCode: HardwareErrorCode.BleBondInvalid,
          },
        })
      )
    ).rejects.toMatchObject({
      name: 'HardwareError',
      errorCode: HardwareErrorCode.BleBondInvalid,
    });

    await expect(invokeNobleBleIpc(Promise.resolve('connected'))).resolves.toBe('connected');
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
    await expect(connectPromise).resolves.toEqual({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        name: 'HardwareError',
        message: 'expected test connection failure',
        errorCode: HardwareErrorCode.BleConnectedError,
      },
    });
    expect(peripheral.connect).toHaveBeenCalledTimes(1);
  });

  test('disconnects and settles a pending Noble connect before a late callback arrives', async () => {
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
    let stopScanningCallback: (() => void) | undefined;
    let connectCallback: ((error?: Error) => void) | undefined;
    let resolveConnectStarted = () => undefined;
    const connectStarted = new Promise<void>(resolve => {
      resolveConnectStarted = resolve;
    });
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('pending-device', 'Pro2 C3D4'),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          connectCallback = callback;
          resolveConnectStarted();
        }),
        disconnect: jest.fn((callback: () => void) => {
          peripheral.state = 'disconnected';
          callback();
        }),
        discoverServices: jest.fn(),
      }
    );
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', peripheral);
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
    const disconnect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT);
    if (!connect || !disconnect) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    const connectPromise = Promise.resolve(connect(undefined, peripheral.id));
    await Promise.resolve();
    stopScanningCallback?.();
    await connectStarted;

    await expect(Promise.resolve(disconnect(undefined, peripheral.id))).resolves.toBeUndefined();
    await expect(connectPromise).resolves.toMatchObject({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        errorCode: HardwareErrorCode.BleDeviceDisconnected,
      },
    });
    expect(peripheral.disconnect).toHaveBeenCalledTimes(1);

    peripheral.state = 'connected';
    connectCallback?.();
    await Promise.resolve();

    expect(peripheral.discoverServices).not.toHaveBeenCalled();
    expect(peripheral.disconnect).toHaveBeenCalledTimes(2);
  });

  test('disconnects and settles a pending forced reconnect before a late callback arrives', async () => {
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
    let stopScanningCallback: (() => void) | undefined;
    const connectCallbacks: Array<(error?: Error) => void> = [];
    let resolveInitialConnectStarted = () => undefined;
    const initialConnectStarted = new Promise<void>(resolve => {
      resolveInitialConnectStarted = resolve;
    });
    let resolveForcedReconnectStarted = () => undefined;
    const forcedReconnectStarted = new Promise<void>(resolve => {
      resolveForcedReconnectStarted = resolve;
    });
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('forced-reconnect-device', 'Pro2 C3D4'),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          connectCallbacks.push(callback);
          if (connectCallbacks.length === 1) {
            resolveInitialConnectStarted();
          } else if (connectCallbacks.length === 2) {
            resolveForcedReconnectStarted();
          }
        }),
        disconnect: jest.fn((callback: () => void) => {
          peripheral.state = 'disconnected';
          callback();
        }),
        discoverServices: jest.fn(),
      }
    );
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      noble.emit('discover', peripheral);
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
    const disconnect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT);
    if (!connect || !disconnect) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    const connectPromise = Promise.resolve(connect(undefined, peripheral.id));
    await Promise.resolve();
    stopScanningCallback?.();
    await initialConnectStarted;

    peripheral.state = 'connected';
    connectCallbacks[0]?.();
    await forcedReconnectStarted;

    await expect(Promise.resolve(disconnect(undefined, peripheral.id))).resolves.toBeUndefined();
    await expect(connectPromise).resolves.toMatchObject({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        errorCode: HardwareErrorCode.BleDeviceDisconnected,
      },
    });
    expect(peripheral.disconnect).toHaveBeenCalledTimes(2);

    peripheral.state = 'connected';
    connectCallbacks[1]?.();
    await Promise.resolve();

    expect(peripheral.discoverServices).not.toHaveBeenCalled();
    expect(peripheral.disconnect).toHaveBeenCalledTimes(3);
  });

  test('maps a structured native subscription failure before returning it over IPC', async () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
    const nativeError = Object.assign(new Error('Encryption is insufficient'), {
      nativeErrorCode: 15,
      nativeErrorDomain: 'CBATTErrorDomain',
    });
    const notifyCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0003',
      unsubscribe: jest.fn((callback: (error?: Error) => void) => callback()),
      subscribe: jest.fn((callback: (error?: Error) => void) => callback(nativeError)),
    });
    const writeCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0002',
    });
    const service = {
      uuid: '0001',
      discoverCharacteristics: jest.fn(
        (
          _characteristicUuids: string[],
          callback: (error: Error | null, value: unknown[]) => void
        ) => callback(null, [writeCharacteristic, notifyCharacteristic])
      ),
    };
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('subscription-device', 'Pro2 E5F6'),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          peripheral.state = 'connected';
          callback();
        }),
        disconnect: jest.fn((callback: () => void) => {
          peripheral.state = 'disconnected';
          callback();
        }),
        discoverServices: jest.fn(
          (_serviceUuids: string[], callback: (error: Error | null, value: unknown[]) => void) =>
            callback(null, [service])
        ),
      }
    );
    const noble = Object.assign(new EventEmitter(), {
      state: 'poweredOn',
      startScanning: jest.fn((_services, _duplicates, callback) => {
        callback?.();
        noble.emit('discover', peripheral);
      }),
      stopScanning: jest.fn(callback => callback?.()),
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
    const subscribe = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_SUBSCRIBE);
    const disconnect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT);
    if (!connect || !subscribe || !disconnect) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    await expect(Promise.resolve(connect(undefined, peripheral.id))).resolves.toBeUndefined();
    try {
      await expect(Promise.resolve(subscribe(undefined, peripheral.id))).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleBondInvalid,
          params: {
            nativeErrorMessage: 'Notification subscription failed: Encryption is insufficient',
          },
        },
      });
    } finally {
      await disconnect(undefined, peripheral.id);
    }
  });

  test('settles a pending Noble connect with the native disconnect error', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const Noble = require('@stoprocent/noble/lib/noble');
    const bindings = Object.assign(new EventEmitter(), {
      connect: jest.fn(),
    });
    const noble = new Noble(bindings);
    noble._registerListeners();
    const peripheral = noble._createPeripheral(
      'aabbccdd',
      '',
      'unknown',
      true,
      { localName: 'Pro2 A1B2', serviceUuids: ['0001'] },
      -50,
      false
    );
    const connectCallback = jest.fn();

    peripheral.connect(connectCallback);
    const nativeError = new Error(
      'CBErrorDomain:14 Peer removed pairing information on the device side'
    );
    bindings.emit('disconnect', 'aabbccdd', nativeError);

    expect(connectCallback).toHaveBeenCalledWith(nativeError);
    expect(peripheral.state).toBe('disconnected');
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

describe('Noble BLE process shutdown', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  const setup = async (state = 'poweredOn') => {
    const handlers = new Map<string, IpcHandler>();
    const native = Object.assign(new EventEmitter(), {
      state,
      startScanning: jest.fn((_uuids, _duplicates, callback) => callback?.()),
      stopScanning: jest.fn(callback => callback?.()),
      stop: jest.fn(),
    });
    jest.doMock('@stoprocent/noble', () => native);
    jest.doMock('electron', () => ({
      ipcMain: {
        handle: (channel: string, listener: IpcHandler) => handlers.set(channel, listener),
        removeHandler: (channel: string) => handlers.delete(channel),
      },
    }));
    jest.doMock(
      'electron-log',
      () => ({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
      { virtual: true }
    );
    const sdk = await import('../noble-ble-handler');
    const window = new EventEmitter();
    sdk.setupNobleBleHandlers(window as unknown as WebContents);
    return { sdk, native, window, handlers };
  };

  test('does not initialize native BLE when quitting before first use', async () => {
    const { sdk, native, handlers } = await setup();
    await sdk.disposeNobleBleSupport();
    expect(native.stop).not.toHaveBeenCalled();
    expect(handlers.size).toBe(0);
  });

  test('cancels an active scan, ignores its late callback and releases native once', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const { sdk, native, handlers } = await setup();
    let completeScan: (() => void) | undefined;
    native.startScanning.mockImplementation((_uuids, _duplicates, callback) => {
      completeScan = callback;
    });
    const scan = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE)?.({});
    await Promise.resolve();
    await Promise.resolve();
    await sdk.disposeNobleBleSupport();
    await sdk.disposeNobleBleSupport();
    await scan;
    completeScan?.();
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(native.listenerCount('discover')).toBe(0);
    expect(native.listenerCount('stateChange')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('cancels power-on waits before releasing native', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const { sdk, native, handlers } = await setup('unknown');
    const availability = handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    await sdk.disposeNobleBleSupport();
    await availability;
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(native.listenerCount('stateChange')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('disconnects an in-flight connection and rejects its late success', async () => {
    const { sdk, native, handlers } = await setup();
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    let connectCallback: (() => void) | undefined;
    const peripheral = Object.assign(new EventEmitter(), {
      ...createPeripheral('pending-device', 'OneKey Pro'),
      connect: jest.fn(callback => {
        connectCallback = callback;
      }),
      disconnect: jest.fn(callback => callback?.()),
      discoverServices: jest.fn(),
    });
    native.emit('discover', peripheral);
    const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, peripheral.id);
    await Promise.resolve();
    await Promise.resolve();
    expect(peripheral.connect).toHaveBeenCalledTimes(1);
    await sdk.disposeNobleBleSupport();
    expect(peripheral.disconnect).toHaveBeenCalled();
    expect(native.stop).toHaveBeenCalledTimes(1);
    connectCallback?.();
    expect(await connecting).toMatchObject({ success: false });
    expect(peripheral.discoverServices).not.toHaveBeenCalled();
  });

  test('allows a host to defer shared native release until both transports are idle', async () => {
    const { sdk, native, handlers } = await setup();
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    const releaseNoble = jest.fn();
    await sdk.disposeNobleBleSupport(releaseNoble);
    expect(releaseNoble).toHaveBeenCalledWith(native);
    expect(native.stop).not.toHaveBeenCalled();
  });

  test('window destruction preserves the native manager for a soft restart', async () => {
    const { sdk, native, handlers, window } = await setup();
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    window.emit('destroyed');
    await Promise.resolve();
    await Promise.resolve();
    sdk.setupNobleBleHandlers(new EventEmitter() as unknown as WebContents);
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    expect(native.stop).not.toHaveBeenCalled();
    await sdk.disposeNobleBleSupport();
    expect(native.stop).toHaveBeenCalledTimes(1);
  });
});
