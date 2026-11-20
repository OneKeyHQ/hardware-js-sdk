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

  test('maps a structured macOS lost bond to the re-pair error', async () => {
    const { createNobleBleConnectionError } = await import('../noble-ble-handler');

    expect(
      createNobleBleConnectionError(
        Object.assign(new Error('Peer removed pairing information on the device side'), {
          nativeErrorCode: 14,
          nativeErrorDomain: 'CBErrorDomain',
        })
      )
    ).toMatchObject({
      errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation,
      params: {
        phase: 'connect',
        reason: 'peer_removed_pairing_information',
        nativeErrorMessage: 'Peer removed pairing information on the device side',
      },
    });
    // Some Noble builds only keep the domain in the message.
    expect(
      createNobleBleConnectionError(
        new Error('CBErrorDomain:14 Peer removed pairing information on the device side')
      )
    ).toMatchObject({ errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation });
    // Encryption is insufficient is not a lost bond by itself.
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
      errorCode: HardwareErrorCode.BleConnectedError,
    });
    expect(createNobleBleConnectionError(new Error('connection failed'))).toMatchObject({
      errorCode: HardwareErrorCode.BleConnectedError,
    });
  });

  test('classifies Windows pairing failures by state, not message text alone', async () => {
    const {
      isWindowsPairingFailureInContext,
      isWindowsPairingFailureText,
      resolveWindowsNoResponseErrorCode,
      resolveWindowsPairingErrorCode,
    } = await import('../noble-ble-handler');

    expect(isWindowsPairingFailureText('status: 3')).toBe(false);
    expect(isWindowsPairingFailureText('GATT operation failed, status: 3')).toBe(false);
    expect(isWindowsPairingFailureText('Access denied')).toBe(true);
    expect(isWindowsPairingFailureText('Protocol error')).toBe(true);
    expect(isWindowsPairingFailureText('insufficient authentication')).toBe(true);
    expect(isWindowsPairingFailureText('status: 3 insufficient encryption')).toBe(true);
    expect(isWindowsPairingFailureText('getDevice failed')).toBe(false);

    // Bare status: 3 is a pairing failure only in pairing context, never once paired.
    expect(isWindowsPairingFailureInContext('status: 3', true)).toBe(true);
    expect(isWindowsPairingFailureInContext('GATT operation failed, status: 3', true)).toBe(true);
    expect(isWindowsPairingFailureInContext('status: 3', false)).toBe(false);
    expect(isWindowsPairingFailureInContext('GATT operation failed, status: 3', false)).toBe(false);
    expect(isWindowsPairingFailureInContext('status: 30', true)).toBe(false);

    // Explicit authentication-text errors always indicate a pairing failure.
    expect(isWindowsPairingFailureInContext('Access denied', true)).toBe(true);
    expect(isWindowsPairingFailureInContext('Access denied', false)).toBe(true);
    expect(isWindowsPairingFailureInContext('Protocol error', false)).toBe(true);
    expect(isWindowsPairingFailureInContext('insufficient authentication', false)).toBe(true);
    expect(isWindowsPairingFailureInContext('insufficient encryption', false)).toBe(true);
    expect(isWindowsPairingFailureInContext('GATT_INSUF_AUTHENTICATION', false)).toBe(true);
    expect(isWindowsPairingFailureInContext('getDevice failed', true)).toBe(false);
    expect(isWindowsPairingFailureInContext('getDevice failed', false)).toBe(false);

    expect(resolveWindowsPairingErrorCode({ wasBonded: false, canceled: true })).toBe(
      HardwareErrorCode.BleDeviceBondedCanceled
    );
    expect(resolveWindowsPairingErrorCode({ wasBonded: true, canceled: false })).toBe(
      HardwareErrorCode.BleBondInvalid
    );
    expect(resolveWindowsPairingErrorCode({ wasBonded: false, canceled: false })).toBe(
      HardwareErrorCode.BleDeviceBondError
    );

    // A pairing that never produced a notification is the Windows wipe case.
    expect(resolveWindowsNoResponseErrorCode(true)).toBe(HardwareErrorCode.BleBondInvalid);
    expect(resolveWindowsNoResponseErrorCode(false)).toBe(HardwareErrorCode.BleDeviceBondError);
  });

  test('serializes HardwareError fields for the Noble IPC boundary', async () => {
    const { createNobleBleIpcErrorResponse } = await import('../noble-ble-handler');

    expect(
      createNobleBleIpcErrorResponse({
        name: 'HardwareError',
        message: 'Bluetooth connection failed',
        errorCode: HardwareErrorCode.BleConnectedError,
      })
    ).toEqual({
      type: 'NobleBleIpcError',
      success: false,
      error: {
        name: 'HardwareError',
        message: 'Bluetooth connection failed',
        errorCode: HardwareErrorCode.BleConnectedError,
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
            message: 'Bluetooth connection failed',
            errorCode: HardwareErrorCode.BleConnectedError,
          },
        })
      )
    ).rejects.toMatchObject({
      name: 'HardwareError',
      errorCode: HardwareErrorCode.BleConnectedError,
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

  test.each(['Pro A1B2', 'Pro2 A1B2'])(
    'retains %s across scan rounds until Bluetooth is powered off',
    async name => {
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
      const noble = Object.assign(new EventEmitter(), {
        state: 'poweredOn',
        startScanning: jest.fn(),
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

      const enumerate = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE);
      if (!enumerate) {
        throw new Error('Electron Noble BLE enumerate handler was not registered');
      }

      const scan = async (peripherals: ReturnType<typeof createPeripheral>[]) => {
        let resolveScanStarted = () => undefined;
        const scanStarted = new Promise<void>(resolve => {
          resolveScanStarted = resolve;
        });
        noble.startScanning.mockImplementationOnce((_services, _duplicates, callback) => {
          callback?.();
          peripherals.forEach(peripheral => noble.emit('discover', peripheral));
          resolveScanStarted();
        });
        const devices = Promise.resolve(enumerate());
        await scanStarted;
        jest.advanceTimersByTime(5_000);
        return devices;
      };

      const firstDevice = createPeripheral('first-device', name);
      const secondDevice = createPeripheral('second-device', 'Pro2 C3D4');
      await expect(scan([firstDevice])).resolves.toEqual([
        expect.objectContaining({ id: 'first-device', name }),
      ]);
      await expect(scan([secondDevice, secondDevice])).resolves.toEqual([
        expect.objectContaining({ id: 'first-device', name }),
        expect.objectContaining({ id: 'second-device', name: 'Pro2 C3D4' }),
      ]);
      await expect(scan([])).resolves.toHaveLength(2);

      noble.state = 'poweredOff';
      noble.emit('stateChange', 'poweredOff');
      noble.state = 'poweredOn';
      noble.emit('stateChange', 'poweredOn');
      await expect(scan([])).resolves.toEqual([]);
    }
  );

  test.each([
    ['Pro A1B2', 'unavailable'],
    ['Pro2 A1B2', 'unavailable'],
    ['Pro2 A1B2', 'native error 14'],
  ])(
    'refreshes a retained disconnected %s peripheral before cold connecting (direct: %s)',
    async (name, directConnectResult) => {
      const handlers = new Map<string, IpcHandler>();
      const stalePeripheral = Object.assign(new EventEmitter(), createPeripheral('device', name), {
        connect: jest.fn(),
      });
      const freshPeripheral = Object.assign(new EventEmitter(), createPeripheral('device', name), {
        connect: jest.fn((callback: (error?: Error) => void) => {
          callback(new Error('expected fresh connection failure'));
        }),
      });
      const noble = Object.assign(new EventEmitter(), {
        state: 'poweredOn',
        startScanning: jest.fn((_services, _duplicates, callback) => {
          callback?.();
          noble.emit('discover', freshPeripheral);
        }),
        stopScanning: jest.fn(callback => callback?.()),
        connectAsync: jest.fn(() =>
          directConnectResult === 'native error 14'
            ? Promise.reject(
                Object.assign(new Error('native direct connection failure'), {
                  nativeErrorDomain: 'CBErrorDomain',
                  nativeErrorCode: 14,
                })
              )
            : Promise.resolve(undefined)
        ),
      });
      jest.doMock('@stoprocent/noble', () => noble);
      jest.doMock('electron', () => ({
        ipcMain: {
          handle: (channel: string, handler: IpcHandler) => handlers.set(channel, handler),
          removeHandler: (channel: string) => handlers.delete(channel),
        },
      }));
      jest.doMock('electron-log', () => ({
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      }));
      const { setupNobleBleHandlers } = await import('../noble-ble-handler');
      setupNobleBleHandlers({ on: jest.fn(), send: jest.fn() } as unknown as WebContents);
      const availability = handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK);
      const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
      if (!availability || !connect) throw new Error('Noble handlers were not registered');
      await availability();
      noble.emit('discover', stalePeripheral);

      const connected = Promise.resolve(connect(undefined, stalePeripheral.id));
      if (directConnectResult === 'native error 14' && name.startsWith('Pro2')) {
        await expect(connected).resolves.toMatchObject({
          success: false,
          error: { errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation },
        });
        expect(stalePeripheral.connect).not.toHaveBeenCalled();
        expect(freshPeripheral.connect).not.toHaveBeenCalled();
        expect(noble.startScanning).not.toHaveBeenCalled();
        expect(noble.connectAsync).toHaveBeenCalledTimes(1);
        return;
      }

      await expect(connected).resolves.toMatchObject({
        success: false,
        error: { message: 'expected fresh connection failure' },
      });

      expect(stalePeripheral.connect).not.toHaveBeenCalled();
      expect(freshPeripheral.connect).toHaveBeenCalledTimes(1);
      expect(noble.startScanning).toHaveBeenCalledTimes(1);
      expect(noble.connectAsync).toHaveBeenCalledTimes(name.startsWith('Pro2') ? 1 : 0);
    }
  );

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

  test('stops forced reconnect on user pairing cancel without running discovery or fresh scan', async () => {
    const flush = () =>
      new Promise(resolve => {
        setImmediate(resolve);
      });
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
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
      createPeripheral('forced-reconnect-cancel-device', 'Pro2 C3D4'),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          connectCallbacks.push(callback);
          if (connectCallbacks.length === 1) {
            resolveInitialConnectStarted();
          } else if (connectCallbacks.length === 2) {
            resolveForcedReconnectStarted();
          }
        }),
        cancelConnect: jest.fn(() => {
          connectCallbacks[1]?.(new Error('connection canceled'));
        }),
        disconnect: jest.fn((callback: () => void) => {
          peripheral.state = 'disconnected';
          callback();
        }),
        discoverServices: jest.fn(),
      }
    );
    const noble = Object.assign(new EventEmitter(), {
      state: 'poweredOn',
      startScanning: jest.fn((_services, _duplicates, callback) => {
        callback?.();
        noble.emit('discover', peripheral);
      }),
      stopScanning: jest.fn(callback => callback?.()),
      stop: jest.fn(),
    });

    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock('electron', () => ({ ipcMain }));
    jest.doMock('electron-log', () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const sdk = await import('../noble-ble-handler');
    sdk.setupNobleBleHandlers({
      on: jest.fn(),
      send: jest.fn(),
    } as unknown as WebContents);

    const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
    const cancelPairing = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CANCEL_PAIRING);
    if (!connect || !cancelPairing) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    try {
      const connectPromise = Promise.resolve(connect(undefined, peripheral.id));
      await initialConnectStarted;
      expect(noble.startScanning).toHaveBeenCalledTimes(1);

      peripheral.state = 'connected';
      connectCallbacks[0]?.();
      await forcedReconnectStarted;

      await cancelPairing(undefined);
      await expect(connectPromise).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleDeviceBondedCanceled,
        },
      });
      await flush();

      expect(peripheral.discoverServices).not.toHaveBeenCalled();
      expect(noble.startScanning).toHaveBeenCalledTimes(1);
      expect(peripheral.connect).toHaveBeenCalledTimes(2);
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('propagates lost bond during forced reconnect without running discovery or fresh scan', async () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
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
      createPeripheral('forced-reconnect-stale-bond-device', 'Pro2 C3D4'),
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
    const noble = Object.assign(new EventEmitter(), {
      state: 'poweredOn',
      startScanning: jest.fn((_services, _duplicates, callback) => {
        callback?.();
        noble.emit('discover', peripheral);
      }),
      stopScanning: jest.fn(callback => callback?.()),
      stop: jest.fn(),
    });

    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock('electron', () => ({ ipcMain }));
    jest.doMock('electron-log', () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const sdk = await import('../noble-ble-handler');
    sdk.setupNobleBleHandlers({
      on: jest.fn(),
      send: jest.fn(),
    } as unknown as WebContents);

    const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
    if (!connect) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    try {
      const connectPromise = Promise.resolve(connect(undefined, peripheral.id));
      await initialConnectStarted;

      peripheral.state = 'connected';
      connectCallbacks[0]?.();
      await forcedReconnectStarted;

      connectCallbacks[1]?.(
        Object.assign(new Error('Peer removed pairing information'), {
          nativeErrorCode: 14,
          nativeErrorDomain: 'CBErrorDomain',
        })
      );

      await expect(connectPromise).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation,
        },
      });
      expect(peripheral.discoverServices).not.toHaveBeenCalled();
      expect(noble.startScanning).toHaveBeenCalledTimes(1);
      expect(peripheral.connect).toHaveBeenCalledTimes(2);
    } finally {
      await sdk.disposeNobleBleSupport();
    }
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
          errorCode: HardwareErrorCode.BleDeviceNotBonded,
          params: {
            nativeErrorMessage: 'Notification subscription failed: Encryption is insufficient',
          },
        },
      });
    } finally {
      await disconnect(undefined, peripheral.id);
    }
  });

  test('cancels a pending pairing and lets the next connect start a new native attempt', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const flush = () =>
      new Promise(resolve => {
        setImmediate(resolve);
      });
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
    let connectCallback: ((error?: Error) => void) | undefined;
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('pending-pairing-device', 'Pro2 A1B2', ['0001']),
      {
        connect: jest.fn((callback: (error?: Error) => void) => {
          connectCallback = callback;
        }),
        cancelConnect: jest.fn(),
        disconnect: jest.fn((callback: () => void) => {
          peripheral.state = 'disconnected';
          callback();
        }),
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
    const cancelPairing = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CANCEL_PAIRING);
    if (!connect || !cancelPairing) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    const firstConnect = Promise.resolve(connect(undefined, peripheral.id));
    for (let i = 0; i < 50 && !connectCallback; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    expect(peripheral.connect).toHaveBeenCalledTimes(1);

    await cancelPairing(undefined);
    expect(peripheral.cancelConnect).toHaveBeenCalledTimes(1);
    await expect(firstConnect).resolves.toMatchObject({
      type: 'NobleBleIpcError',
      success: false,
      error: { errorCode: HardwareErrorCode.BleDeviceBondedCanceled },
    });

    // A new acquire must reach the native connect again instead of reusing the
    // half-cancelled attempt. The second attempt is left pending on purpose:
    // reaching peripheral.connect() is the assertion, then it is cancelled.
    connectCallback = undefined;
    const secondConnect = Promise.resolve(connect(undefined, peripheral.id));
    for (let i = 0; i < 50 && !connectCallback; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    expect(peripheral.connect).toHaveBeenCalledTimes(2);
    await cancelPairing(undefined);
    await secondConnect;
  });

  test('keeps pairing cancellation when a notification arrives during cancel cleanup', async () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
    const notifyCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0003',
      unsubscribe: jest.fn((callback: (error?: Error) => void) => {
        notifyCharacteristic.emit('data', Buffer.from('aa', 'hex'));
        callback();
      }),
      subscribe: jest.fn((callback: (error?: Error) => void) => callback()),
    });
    const writeCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0002',
      write: jest.fn(
        (_buffer: Buffer, _withoutResponse: boolean, callback: (error?: Error) => void) =>
          callback()
      ),
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
      createPeripheral('cancel-notify-device', 'Pro2 A1B2'),
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
    const write = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_WRITE);
    const cancelPairing = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CANCEL_PAIRING);
    if (!connect || !subscribe || !write || !cancelPairing) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }
    await expect(Promise.resolve(connect(undefined, peripheral.id))).resolves.toBeUndefined();
    await expect(Promise.resolve(subscribe(undefined, peripheral.id))).resolves.toBeUndefined();
    await cancelPairing(undefined);
    await expect(Promise.resolve(write(undefined, peripheral.id, 'aabb'))).resolves.toMatchObject({
      type: 'NobleBleIpcError',
      success: false,
    });
  });

  test('cancels a pending direct connect without falling back to scan', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const flush = () =>
      new Promise(resolve => {
        setImmediate(resolve);
      });
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
    const peripheral = Object.assign(
      new EventEmitter(),
      createPeripheral('direct-pairing-device', 'Pro2 A1B2', ['0001']),
      {
        connect: jest.fn(),
        cancelConnect: jest.fn(),
        disconnect: jest.fn((callback: () => void) => {
          peripheral.state = 'disconnected';
          callback();
        }),
      }
    );
    const cancelConnect = jest.fn();
    const noble = Object.assign(new EventEmitter(), {
      state: 'poweredOn',
      startScanning: jest.fn((_services, _duplicates, callback) => {
        callback?.();
        noble.emit('discover', peripheral);
      }),
      stopScanning: jest.fn(callback => callback?.()),
      connectAsync: jest.fn(
        () =>
          new Promise(() => {
            // Stay pending in the direct-connect phase.
          })
      ),
      cancelConnect,
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

    const availability = handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK);
    const enumerate = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE);
    const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
    const cancelPairing = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CANCEL_PAIRING);
    if (!availability || !enumerate || !connect || !cancelPairing) {
      throw new Error('Electron Noble BLE handlers were not registered');
    }

    await availability();
    const enumerated = Promise.resolve(enumerate());
    await flush();
    jest.advanceTimersByTime(5_000);
    await enumerated;

    const connecting = Promise.resolve(connect(undefined, peripheral.id));
    await flush();
    jest.advanceTimersByTime(0);
    await flush();
    expect(noble.connectAsync).toHaveBeenCalledTimes(1);
    expect(noble.startScanning).toHaveBeenCalledTimes(1);

    await cancelPairing(undefined);
    await expect(connecting).resolves.toMatchObject({
      type: 'NobleBleIpcError',
      success: false,
      error: { errorCode: HardwareErrorCode.BleDeviceBondedCanceled },
    });
    expect(cancelConnect).toHaveBeenCalledWith(peripheral.id);
    expect(peripheral.connect).not.toHaveBeenCalled();
    expect(noble.startScanning).toHaveBeenCalledTimes(1);
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
  const flushCallbacks = () =>
    new Promise<void>(resolve => {
      setImmediate(resolve);
    });
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

  test.each([
    ['poweredOff', HardwareErrorCode.BlePoweredOff],
    ['unauthorized', HardwareErrorCode.BleLocationError],
    ['unsupported', HardwareErrorCode.BleUnsupported],
  ])(
    'preserves adapter state %s across repeated scans and connections',
    async (state, errorCode) => {
      jest.useFakeTimers({ doNotFake: ['performance'] });
      const { sdk, native, handlers } = await setup(state);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        for (const channel of [
          EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE,
          EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT,
        ]) {
          await expect(handlers.get(channel)?.({}, 'device')).resolves.toMatchObject({
            success: false,
            error: { errorCode },
          });
        }
      }
      expect(native.startScanning).not.toHaveBeenCalled();
      expect(native.listenerCount('stateChange')).toBe(1);
      expect(jest.getTimerCount()).toBe(0);
      await sdk.disposeNobleBleSupport();
    }
  );

  test.each([
    ['poweredOff', HardwareErrorCode.BlePoweredOff],
    ['unauthorized', HardwareErrorCode.BleLocationError],
    ['unsupported', HardwareErrorCode.BleUnsupported],
  ])('checks adapter state %s again after initialization', async (state, errorCode) => {
    const { sdk, native, handlers } = await setup();
    const checkAvailability = handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK);
    await expect(checkAvailability?.({})).resolves.toMatchObject({ available: true });
    native.state = state;
    native.emit('stateChange', state);
    for (const channel of [
      EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE,
      EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT,
    ]) {
      await expect(handlers.get(channel)?.({}, 'device')).resolves.toMatchObject({
        success: false,
        error: { errorCode },
      });
    }
    expect(native.startScanning).not.toHaveBeenCalled();
    native.state = 'poweredOn';
    native.emit('stateChange', native.state);
    await expect(checkAvailability?.({})).resolves.toMatchObject({ available: true });
    await sdk.disposeNobleBleSupport();
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

  test('keeps one native direct connection across repeated probe timeouts for the same device', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const { sdk, native, handlers } = await setup();
    // Use Noble's real exclusive listeners without loading its native bindings.
    const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
    const direct = new Noble({ connect: jest.fn(), cancelConnect: jest.fn() });
    const connectAsync = jest.fn((id: string) => direct.connectAsync(id));
    const cancelConnect = jest.fn((id: string) => direct.cancelConnect(id));
    Object.assign(native, { connectAsync, cancelConnect });
    const deviceId = 'aabbccddeeff';

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, deviceId);
      await flushCallbacks();
      jest.advanceTimersByTime(1500);
      await flushCallbacks();
      expect(connectAsync).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(2000);
      await flushCallbacks();
      expect(await connecting).toMatchObject({
        success: false,
        error: { errorCode: HardwareErrorCode.DeviceNotFound },
      });
      jest.advanceTimersByTime(15_000);
    }

    expect(cancelConnect).not.toHaveBeenCalled();
    const disposing = sdk.disposeNobleBleSupport();
    await flushCallbacks();
    expect(native.stop).toHaveBeenCalledTimes(1);
    await disposing;
    expect(cancelConnect).toHaveBeenCalledTimes(1);
    expect(direct.listenerCount(`connect:${deviceId}`)).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('cleans up native success arriving after the direct probe timeout', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const { sdk, native, handlers } = await setup();
    const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
    const disconnect = jest.fn();
    const direct = new Noble({ connect: jest.fn(), cancelConnect: jest.fn(), disconnect });
    disconnect.mockImplementation((id: string) => direct._onDisconnect(id));
    const peripheral = direct._createPeripheral(
      'aabbccddeeff',
      '',
      '',
      true,
      { localName: 'OneKey Pro' },
      0,
      true
    );
    const cancelConnect = jest.fn((id: string) => direct.cancelConnect(id));
    Object.assign(native, {
      connectAsync: jest.fn((id: string) => direct.connectAsync(id)),
      cancelConnect,
    });
    const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, peripheral.id);
    await flushCallbacks();
    jest.advanceTimersByTime(1500);
    await flushCallbacks();
    jest.advanceTimersByTime(2000);
    await flushCallbacks();
    expect(await connecting).toMatchObject({ success: false });

    direct._onConnect(peripheral.id, null);
    await flushCallbacks();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(peripheral.state).toBe('disconnected');
    await sdk.disposeNobleBleSupport();
    expect(cancelConnect).not.toHaveBeenCalled();
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('retries unavailable native IDs after cooldown without retaining connections', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const { sdk, native, handlers } = await setup();
    const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
    const connect = jest.fn(() => {
      throw new Error('Peripheral could not be retrieved for connection');
    });
    const direct = new Noble({ connect, cancelConnect: jest.fn() });
    const cancelConnect = jest.fn((id: string) => direct.cancelConnect(id));
    Object.assign(native, {
      connectAsync: jest.fn((id: string) => direct.connectAsync(id)),
      cancelConnect,
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.(
        {},
        'aabbccddeeff'
      );
      await flushCallbacks();
      jest.advanceTimersByTime(1500);
      await flushCallbacks();
      expect(await connecting).toMatchObject({ success: false });
      expect(connect).toHaveBeenCalledTimes(attempt + 1);
      expect(jest.getTimerCount()).toBe(0);
      jest.advanceTimersByTime(15_000);
    }

    const disposing = sdk.disposeNobleBleSupport();
    await flushCallbacks();
    expect(native.stop).toHaveBeenCalledTimes(1);
    await disposing;
    expect(cancelConnect).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['before', 'after'])(
    'retries a direct connection that fails before discovery %s the probe timeout',
    async phase => {
      jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
      const { sdk, native, handlers } = await setup();
      const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
      const bindings = Object.assign(new EventEmitter(), {
        connect: jest.fn(),
        cancelConnect: jest.fn(),
      });
      const direct = new Noble(bindings);
      direct._registerListeners();
      direct.removeAllListeners('warning');
      direct.on('warning', jest.fn());
      const connectAsync = jest.fn((id: string) => direct.connectAsync(id));
      Object.assign(native, {
        connectAsync,
        cancelConnect: jest.fn((id: string) => direct.cancelConnect(id)),
      });
      const deviceId = 'aabbccddeeff';
      let firstFinished = false;
      const connecting = Promise.resolve(
        handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, deviceId)
      ).then(result => {
        firstFinished = true;
        return result;
      });
      await flushCallbacks();
      jest.advanceTimersByTime(1500);
      await flushCallbacks();
      expect(connectAsync).toHaveBeenCalledTimes(1);
      expect(direct._peripherals.has(deviceId)).toBe(false);
      if (phase === 'after') {
        jest.advanceTimersByTime(2000);
        await flushCallbacks();
      }
      bindings.emit('connect', deviceId, new Error('native async connection failed'));
      await flushCallbacks();
      await flushCallbacks();
      await flushCallbacks();
      expect(firstFinished).toBe(true);
      expect(await connecting).toMatchObject({ success: false });

      jest.advanceTimersByTime(15_000);
      jest.advanceTimersByTime(1);
      const retry = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, deviceId);
      await flushCallbacks();
      jest.advanceTimersByTime(1500);
      await flushCallbacks();
      expect(connectAsync).toHaveBeenCalledTimes(2);
      const disposing = sdk.disposeNobleBleSupport();
      await flushCallbacks();
      expect(native.stop).toHaveBeenCalledTimes(1);
      await disposing;
      expect(await retry).toMatchObject({ success: false });
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  test('shares concurrent connections instead of cancelling a newer direct probe', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const { sdk, native, handlers } = await setup();
    const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
    const direct = new Noble({ connect: jest.fn(), cancelConnect: jest.fn() });
    const connectAsync = jest.fn((id: string) => direct.connectAsync(id));
    const cancelConnect = jest.fn((id: string) => direct.cancelConnect(id));
    Object.assign(native, { connectAsync, cancelConnect });
    const connect = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT);
    const first = connect?.({}, 'aabbccddeeff');
    await flushCallbacks();
    jest.advanceTimersByTime(1500);
    await flushCallbacks();
    jest.advanceTimersByTime(500);
    const second = connect?.({}, 'aabbccddeeff');
    await flushCallbacks();
    expect(native.startScanning).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1500);
    await flushCallbacks();
    expect(await first).toMatchObject({ success: false });
    expect(await second).toMatchObject({ success: false });
    expect(connectAsync).toHaveBeenCalledTimes(1);
    expect(cancelConnect).not.toHaveBeenCalled();

    const disposing = sdk.disposeNobleBleSupport();
    await flushCallbacks();
    expect(native.stop).toHaveBeenCalledTimes(1);
    await disposing;
    expect(cancelConnect).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('keeps late direct connect cleanup without native cancellation support', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const { sdk, native, handlers } = await setup();
    const peripheral = Object.assign(new EventEmitter(), {
      ...createPeripheral('late-device', 'OneKey Pro'),
      disconnect: jest.fn(callback => callback?.()),
    });
    let finishConnect: ((value: typeof peripheral) => void) | undefined;
    Object.assign(native, {
      connectAsync: jest.fn(
        () =>
          new Promise<typeof peripheral>(resolve => {
            finishConnect = resolve;
          })
      ),
    });
    const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, peripheral.id);
    await flushCallbacks();
    jest.advanceTimersByTime(1500);
    await flushCallbacks();
    jest.advanceTimersByTime(2000);
    await flushCallbacks();
    expect(await connecting).toMatchObject({
      success: false,
      error: { errorCode: HardwareErrorCode.DeviceNotFound },
    });

    peripheral.state = 'connected';
    finishConnect?.(peripheral);
    await flushCallbacks();
    expect(peripheral.disconnect).toHaveBeenCalledTimes(1);
    await sdk.disposeNobleBleSupport();
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('cancels native connects and waits for disconnect before release', async () => {
    const { sdk, native, handlers } = await setup();
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    let connectCallback: ((error?: Error) => void) | undefined;
    let disconnectCallback: (() => void) | undefined;
    const peripheral = Object.assign(new EventEmitter(), {
      ...createPeripheral('pending-device', 'OneKey Pro'),
      connect: jest.fn(callback => {
        connectCallback = callback;
      }),
      cancelConnect: jest.fn(() => connectCallback?.(new Error('connection canceled'))),
      disconnect: jest.fn(callback => {
        disconnectCallback = callback;
      }),
      discoverServices: jest.fn(),
    });
    native.emit('discover', peripheral);
    native.startScanning.mockImplementationOnce((_uuids, _duplicates, callback) => {
      callback?.();
      native.emit('discover', peripheral);
    });
    const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, peripheral.id);
    await flushCallbacks();
    expect(peripheral.connect).toHaveBeenCalledTimes(1);
    const disposing = sdk.disposeNobleBleSupport();
    await flushCallbacks();
    expect(peripheral.cancelConnect).toHaveBeenCalledTimes(1);
    expect(peripheral.disconnect).toHaveBeenCalled();
    expect(native.stop).not.toHaveBeenCalled();
    disconnectCallback?.();
    await disposing;
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(await connecting).toMatchObject({ success: false });
    expect(peripheral.discoverServices).not.toHaveBeenCalled();
  });

  test.each(['peripheral', 'direct'])(
    'keeps late %s connects inert after the disposal timeout',
    async route => {
      jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
      const { sdk, native, handlers } = await setup();
      await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
      let finishConnect: () => void = () => undefined;
      const peripheral = Object.assign(new EventEmitter(), {
        ...createPeripheral('late-device', 'OneKey Pro'),
        connect: jest.fn(callback => {
          finishConnect = () => callback();
        }),
        cancelConnect: jest.fn(),
        disconnect: jest.fn(callback => callback?.()),
        discoverServices: jest.fn(),
      });
      const connectAsync = jest.fn(
        () =>
          new Promise(resolve => {
            finishConnect = () => resolve(peripheral);
          })
      );
      const cancelConnect = jest.fn();
      if (route === 'direct') Object.assign(native, { connectAsync, cancelConnect });
      else {
        native.emit('discover', peripheral);
        native.startScanning.mockImplementationOnce((_uuids, _duplicates, callback) => {
          callback?.();
          native.emit('discover', peripheral);
        });
      }
      const connecting = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT)?.({}, peripheral.id);
      await flushCallbacks();
      if (route === 'direct') {
        jest.advanceTimersByTime(1500);
        await flushCallbacks();
      }
      expect(route === 'direct' ? connectAsync : peripheral.connect).toHaveBeenCalledTimes(1);
      const disposing = sdk.disposeNobleBleSupport();
      await flushCallbacks();
      expect(route === 'direct' ? cancelConnect : peripheral.cancelConnect).toHaveBeenCalledTimes(
        1
      );
      expect(native.stop).not.toHaveBeenCalled();
      jest.advanceTimersByTime(3500);
      await disposing;
      const disconnects = peripheral.disconnect.mock.calls.length;
      peripheral.state = 'connected';
      finishConnect();
      await flushCallbacks();
      expect(peripheral.disconnect).toHaveBeenCalledTimes(disconnects);
      expect(peripheral.discoverServices).not.toHaveBeenCalled();
      expect(native.stop).toHaveBeenCalledTimes(1);
      expect(await connecting).toMatchObject({ success: false });
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  test('allows a host to defer shared native release until both transports are idle', async () => {
    const { sdk, native, handlers } = await setup();
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    const releaseNoble = jest.fn();
    await sdk.disposeNobleBleSupport(releaseNoble);
    expect(releaseNoble).toHaveBeenCalledWith(native);
    expect(native.stop).not.toHaveBeenCalled();
  });

  test('replacement window scanning waits for old cleanup and preserves native', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    const { sdk, native, handlers, window } = await setup();
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
    let finishOldCleanup: (() => void) | undefined;
    native.stopScanning.mockImplementationOnce(callback => {
      finishOldCleanup = callback;
    });
    window.emit('destroyed');
    sdk.setupNobleBleHandlers(new EventEmitter() as unknown as WebContents);
    const scan = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE)?.({});
    await flushCallbacks();
    expect(native.startScanning).not.toHaveBeenCalled();
    finishOldCleanup?.();
    await flushCallbacks();
    expect(native.startScanning).toHaveBeenCalledTimes(1);
    expect(native.listenerCount('discover')).toBe(1);
    native.emit('discover', createPeripheral('replacement-device', 'OneKey Pro'));
    jest.advanceTimersByTime(5000);
    expect(await scan).toEqual([expect.objectContaining({ id: 'replacement-device' })]);
    expect(native.stop).not.toHaveBeenCalled();
    await sdk.disposeNobleBleSupport();
    expect(native.stop).toHaveBeenCalledTimes(1);
  });

  test.each(['started', 'late-start-callback'])(
    'retires an old enumeration before a shared native scan resumes: %s',
    async scanState => {
      jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
      const { sdk, native, handlers, window } = await setup();
      let lateStart: (() => void) | undefined;
      if (scanState === 'late-start-callback') {
        native.startScanning.mockImplementationOnce((_uuids, _duplicates, callback) => {
          lateStart = callback;
        });
      }
      let oldScanSettled = false;
      const oldScan = Promise.resolve(
        handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE)?.({})
      ).then(result => {
        oldScanSettled = true;
        return result;
      });
      await flushCallbacks();
      jest.advanceTimersByTime(1000);

      let finishOldScan: (() => void) | undefined;
      native.stopScanning.mockImplementationOnce(callback => {
        finishOldScan = callback;
      });
      window.emit('destroyed');
      sdk.setupNobleBleHandlers(new EventEmitter() as unknown as WebContents);
      const replacementReady = handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});
      let replacementSettled = false;
      Promise.resolve(replacementReady).then(() => {
        replacementSettled = true;
      });
      await flushCallbacks();
      expect(replacementSettled).toBe(false);
      finishOldScan?.();
      await replacementReady;
      await flushCallbacks();
      expect(oldScanSettled).toBe(true);
      expect(await oldScan).toEqual([]);

      // Another transport can now scan on the same process-wide Noble instance.
      native.startScanning([], true, () => undefined);
      const stopCount = native.stopScanning.mock.calls.length;
      lateStart?.();
      jest.advanceTimersByTime(5000);
      await flushCallbacks();
      expect(native.stopScanning).toHaveBeenCalledTimes(stopCount);
      expect(jest.getTimerCount()).toBe(0);
      expect(native.stop).not.toHaveBeenCalled();
      await sdk.disposeNobleBleSupport();
    }
  );

  test('does not start an old window enumeration after Bluetooth becomes ready', async () => {
    const { sdk, native, handlers, window } = await setup('unknown');
    const oldScan = handlers.get(EOneKeyBleMessageKeys.NOBLE_BLE_ENUMERATE)?.({});
    await flushCallbacks();
    window.emit('destroyed');
    sdk.setupNobleBleHandlers(new EventEmitter() as unknown as WebContents);
    await handlers.get(EOneKeyBleMessageKeys.BLE_AVAILABILITY_CHECK)?.({});

    native.state = 'poweredOn';
    native.emit('stateChange', 'poweredOn');
    expect(await oldScan).toEqual([]);
    expect(native.startScanning).not.toHaveBeenCalled();
    await sdk.disposeNobleBleSupport();
  });
});

describe('Electron Noble BLE advertisement color', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('keeps the color of an unnamed advertisement once the scan response names the device', async () => {
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
    const peripheral = createPeripheral('split-advertisement-device');
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      // Primary advertisement: services and color, but no name yet.
      Object.assign(peripheral.advertisement, {
        manufacturerData: Buffer.from([0x42, 0, 0, 0, 0]),
      });
      noble.emit('discover', peripheral);
      // Scan response: the name arrives, without the manufacturer payload.
      Object.assign(peripheral.advertisement, {
        localName: 'Pro 2 A1B2',
        manufacturerData: Buffer.alloc(0),
      });
      noble.emit('discover', peripheral);
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
      {
        commType: 'electron-ble',
        id: 'split-advertisement-device',
        name: 'Pro 2 A1B2',
        state: 'disconnected',
        bleColorCode: 'B',
      },
    ]);
  });

  test('applies a color that arrives after the device was listed in the same scan', async () => {
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
    const peripheral = createPeripheral('late-color-device', 'Neo 1A2B');
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      Object.assign(peripheral.advertisement, { manufacturerData: Buffer.from([0, 0, 0, 0, 0]) });
      noble.emit('discover', peripheral);
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
    // The first periodic check lists the device before its color is advertised.
    jest.advanceTimersByTime(600);
    Object.assign(peripheral.advertisement, {
      manufacturerData: Buffer.from([0x45, 0, 0, 0, 0]),
    });
    noble.emit('discover', peripheral);
    jest.advanceTimersByTime(5000);

    await expect(devicesPromise).resolves.toEqual([
      {
        commType: 'electron-ble',
        id: 'late-color-device',
        name: 'Neo 1A2B',
        state: 'disconnected',
        bleColorCode: 'E',
      },
    ]);
  });

  test('keeps the advertised color after Noble overwrites the manufacturer data', async () => {
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
    const coloredPeripheral = createPeripheral('colored-device', 'Pro 2 A1B2');
    const legacyPeripheral = createPeripheral('legacy-device', 'Pro 2 C3D4');
    noble.state = 'poweredOn';
    noble.startScanning = jest.fn((_services, _duplicates, callback) => {
      callback?.();
      Object.assign(coloredPeripheral.advertisement, {
        manufacturerData: Buffer.from([0x44, 0, 0, 0, 0]),
      });
      noble.emit('discover', coloredPeripheral);
      // macOS and Windows replace the stored payload with an empty buffer when a
      // later event carries no 0xFF section.
      Object.assign(coloredPeripheral.advertisement, { manufacturerData: Buffer.alloc(0) });
      noble.emit('discover', coloredPeripheral);
      Object.assign(legacyPeripheral.advertisement, {
        manufacturerData: Buffer.from([0, 0, 0, 0]),
      });
      noble.emit('discover', legacyPeripheral);
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
      {
        commType: 'electron-ble',
        id: 'colored-device',
        name: 'Pro 2 A1B2',
        state: 'disconnected',
        bleColorCode: 'D',
      },
      {
        commType: 'electron-ble',
        id: 'legacy-device',
        name: 'Pro 2 C3D4',
        state: 'disconnected',
      },
    ]);
  });
});

describe('Noble synchronous native connection failures', () => {
  test.each(['direct', 'peripheral'] as const)(
    'releases %s async connection listeners and permits a subsequent retry',
    async entry => {
      const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
      const error = new Error('Peripheral could not be retrieved for connection');
      const bindings = { connect: jest.fn() };
      const noble = new Noble(bindings);
      noble.removeAllListeners('warning');
      noble.on('warning', jest.fn());
      const deviceId = 'aabbccddeeff';
      const peripheral =
        entry === 'peripheral'
          ? noble._createPeripheral(deviceId, '', '', true, {}, 0, true)
          : undefined;
      bindings.connect.mockImplementationOnce(() => {
        throw error;
      });

      await expect(
        entry === 'direct' ? noble.connectAsync(deviceId) : peripheral.connectAsync()
      ).rejects.toBe(error);
      expect(noble.listenerCount(`connect:${deviceId}`)).toBe(0);
      expect(noble._exclusiveCallbacks?.size ?? 0).toBe(0);
      if (peripheral) {
        expect(peripheral.state).toBe('error');
        expect(peripheral.listenerCount('connect')).toBe(0);
        expect(peripheral._exclusiveCallbacks.size).toBe(0);
      }

      const retryPeripheral =
        peripheral ?? noble._createPeripheral(deviceId, '', '', true, {}, 0, true);
      const retry =
        entry === 'direct' ? noble.connectAsync(deviceId) : retryPeripheral.connectAsync();
      noble._onConnect(deviceId);
      await retry;
      expect(retryPeripheral.state).toBe('connected');
      expect(bindings.connect).toHaveBeenCalledTimes(2);
      expect(noble.listenerCount(`connect:${deviceId}`)).toBe(0);
      expect(retryPeripheral.listenerCount('connect')).toBe(0);
    }
  );

  test.each(['direct', 'peripheral'] as const)(
    'settles the %s callback once when the binding throws',
    entry => {
      const Noble = jest.requireActual('@stoprocent/noble/lib/noble');
      const error = new Error('Peripheral could not be retrieved for connection');
      const noble = new Noble({
        connect: () => {
          throw error;
        },
      });
      const deviceId = 'aabbccddeeff';
      const peripheral = noble._createPeripheral(deviceId, '', '', true, {}, 0, true);
      const callback = jest.fn();

      expect(() =>
        entry === 'direct'
          ? noble.connect(deviceId, undefined, callback)
          : peripheral.connect(undefined, callback)
      ).not.toThrow();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toBe(error);
      expect(peripheral.state).toBe('error');
      expect(noble.listenerCount(`connect:${deviceId}`)).toBe(0);
      expect(peripheral.listenerCount('connect')).toBe(0);
      noble._onConnect(deviceId, error);
      expect(callback).toHaveBeenCalledTimes(1);
    }
  );
});

describe('Windows BLE pairing failure classification', () => {
  const originalPlatform = process.platform;
  const flushCallbacks = () =>
    new Promise<void>(resolve => {
      setImmediate(resolve);
    });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  const setupWindowsNobleBle = async (options?: { subscribeError?: Error }) => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: jest.fn((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel: string) => {
        handlers.delete(channel);
      }),
    };
    const notifyCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0003',
      unsubscribe: jest.fn((callback: (error?: Error) => void) => callback()),
      subscribe: jest.fn((callback: (error?: Error) => void) => callback(options?.subscribeError)),
    });
    const writeCharacteristic = Object.assign(new EventEmitter(), {
      uuid: '0002',
      write: jest.fn(
        (_buffer: Buffer, _withoutResponse: boolean, callback: (error?: Error) => void) =>
          callback()
      ),
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
      createPeripheral('win-pairing-device', 'Pro2 A1B2'),
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
      stop: jest.fn(),
    });

    jest.doMock('@stoprocent/noble', () => noble);
    jest.doMock('electron', () => ({ ipcMain }));
    jest.doMock('electron-log', () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const sdk = await import('../noble-ble-handler');
    sdk.setupNobleBleHandlers({
      on: jest.fn(),
      send: jest.fn(),
    } as unknown as WebContents);

    const getHandler = (channel: string) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Electron Noble BLE handler ${channel} was not registered`);
      }
      return handler;
    };

    return {
      sdk,
      peripheral,
      notifyCharacteristic,
      writeCharacteristic,
      connect: getHandler(EOneKeyBleMessageKeys.NOBLE_BLE_CONNECT),
      disconnect: getHandler(EOneKeyBleMessageKeys.NOBLE_BLE_DISCONNECT),
      subscribe: getHandler(EOneKeyBleMessageKeys.NOBLE_BLE_SUBSCRIBE),
      unsubscribe: getHandler(EOneKeyBleMessageKeys.NOBLE_BLE_UNSUBSCRIBE),
      write: getHandler(EOneKeyBleMessageKeys.NOBLE_BLE_WRITE),
      cancelPairing: getHandler(EOneKeyBleMessageKeys.NOBLE_BLE_CANCEL_PAIRING),
    };
  };

  test('tears down and maps first-write status: 3 before pairing to BleDeviceBondError', async () => {
    const {
      sdk,
      peripheral,
      notifyCharacteristic,
      writeCharacteristic,
      connect,
      subscribe,
      write,
    } = await setupWindowsNobleBle();

    try {
      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      await expect(subscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      peripheral.disconnect.mockClear();
      notifyCharacteristic.unsubscribe.mockClear();

      writeCharacteristic.write.mockImplementationOnce((_buf, _withoutResp, cb) =>
        cb(new Error('GATT operation failed, status: 3'))
      );

      await expect(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      ).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleDeviceBondError,
          params: {
            phase: 'pairing',
            platform: 'win32',
            stage: 'write',
            reason: 'pairing_failed',
          },
        },
      });
      expect(notifyCharacteristic.unsubscribe).toHaveBeenCalledTimes(1);
      expect(peripheral.disconnect).toHaveBeenCalledTimes(1);
      expect(peripheral.state).toBe('disconnected');

      await expect(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      ).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: { errorCode: HardwareErrorCode.BleCharacteristicNotFound },
      });
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('tears down and maps first-write status: 3 after a prior bond to BleBondInvalid', async () => {
    const {
      sdk,
      peripheral,
      notifyCharacteristic,
      writeCharacteristic,
      connect,
      disconnect,
      subscribe,
      write,
    } = await setupWindowsNobleBle();

    try {
      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      await expect(subscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      notifyCharacteristic.emit('data', Buffer.from('aa', 'hex'));
      await expect(disconnect(undefined, peripheral.id)).resolves.toBeUndefined();

      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      await expect(subscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      peripheral.disconnect.mockClear();
      notifyCharacteristic.unsubscribe.mockClear();

      writeCharacteristic.write.mockImplementationOnce((_buf, _withoutResp, cb) =>
        cb(new Error('status: 3'))
      );

      await expect(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      ).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleBondInvalid,
          params: {
            phase: 'pairing',
            platform: 'win32',
            stage: 'write',
            reason: 'stale_bond',
          },
        },
      });
      expect(notifyCharacteristic.unsubscribe).toHaveBeenCalledTimes(1);
      expect(peripheral.disconnect).toHaveBeenCalledTimes(1);

      await expect(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      ).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: { errorCode: HardwareErrorCode.BleCharacteristicNotFound },
      });
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('tears down and maps first-write status: 3 with cancel marker to BleDeviceBondedCanceled', async () => {
    const {
      sdk,
      peripheral,
      notifyCharacteristic,
      writeCharacteristic,
      connect,
      subscribe,
      write,
      cancelPairing,
    } = await setupWindowsNobleBle();

    try {
      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      await expect(subscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      peripheral.disconnect.mockClear();
      notifyCharacteristic.unsubscribe.mockClear();

      let finishWrite: ((error?: Error) => void) | undefined;
      writeCharacteristic.write.mockImplementationOnce((_buf, _withoutResp, cb) => {
        finishWrite = cb;
      });

      const writePromise = Promise.resolve(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      );
      await flushCallbacks();
      expect(finishWrite).toBeDefined();

      await cancelPairing(undefined);
      finishWrite?.(new Error('status: 3'));

      await expect(writePromise).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleDeviceBondedCanceled,
          params: {
            phase: 'pairing',
            platform: 'win32',
            stage: 'write',
            reason: 'canceled',
          },
        },
      });
      expect(notifyCharacteristic.unsubscribe).toHaveBeenCalled();
      expect(peripheral.disconnect).toHaveBeenCalled();

      await expect(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      ).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: { errorCode: HardwareErrorCode.BleCharacteristicNotFound },
      });
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('keeps link when an already-paired write fails with status: 3', async () => {
    const {
      sdk,
      peripheral,
      notifyCharacteristic,
      writeCharacteristic,
      connect,
      subscribe,
      write,
    } = await setupWindowsNobleBle();

    try {
      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      await expect(subscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      notifyCharacteristic.emit('data', Buffer.from('aa', 'hex'));
      peripheral.disconnect.mockClear();
      notifyCharacteristic.unsubscribe.mockClear();

      writeCharacteristic.write.mockImplementationOnce((_buf, _withoutResp, cb) =>
        cb(new Error('GATT operation failed, status: 3'))
      );

      await expect(write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })).resolves.toEqual({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          name: 'Error',
          message: 'GATT operation failed, status: 3',
          errorCode: HardwareErrorCode.UnknownError,
        },
      });
      expect(peripheral.disconnect).not.toHaveBeenCalled();
      expect(notifyCharacteristic.unsubscribe).not.toHaveBeenCalled();
      expect(peripheral.state).toBe('connected');

      await expect(
        write(undefined, peripheral.id, 'ccdd', { pacingDelayMs: 0 })
      ).resolves.toBeUndefined();
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('tears down when Windows subscribe fails with status: 3 before pairing', async () => {
    const { sdk, peripheral, connect, subscribe, write } = await setupWindowsNobleBle({
      subscribeError: new Error('CCCD write failed, status: 3'),
    });

    try {
      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      peripheral.disconnect.mockClear();

      await expect(subscribe(undefined, peripheral.id)).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleDeviceBondError,
          params: {
            phase: 'pairing',
            platform: 'win32',
            stage: 'subscribe',
            reason: 'pairing_failed',
          },
        },
      });
      expect(peripheral.disconnect).toHaveBeenCalledTimes(1);

      await expect(
        write(undefined, peripheral.id, 'aabb', { pacingDelayMs: 0 })
      ).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: { errorCode: HardwareErrorCode.BleCharacteristicNotFound },
      });
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });

  test('keeps generic error when Windows subscribe fails with status: 3 after pairing', async () => {
    const { sdk, peripheral, notifyCharacteristic, connect, subscribe, unsubscribe } =
      await setupWindowsNobleBle();

    try {
      await expect(connect(undefined, peripheral.id)).resolves.toBeUndefined();
      await expect(subscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      notifyCharacteristic.emit('data', Buffer.from('aa', 'hex'));
      await expect(unsubscribe(undefined, peripheral.id)).resolves.toBeUndefined();
      peripheral.disconnect.mockClear();

      notifyCharacteristic.subscribe.mockImplementationOnce((cb: (error?: Error) => void) =>
        cb(new Error('CCCD write failed, status: 3'))
      );

      await expect(subscribe(undefined, peripheral.id)).resolves.toMatchObject({
        type: 'NobleBleIpcError',
        success: false,
        error: {
          errorCode: HardwareErrorCode.BleConnectedError,
          message: 'Notification subscription failed: CCCD write failed, status: 3',
        },
      });
      expect(peripheral.disconnect).not.toHaveBeenCalled();
    } finally {
      await sdk.disposeNobleBleSupport();
    }
  });
});
