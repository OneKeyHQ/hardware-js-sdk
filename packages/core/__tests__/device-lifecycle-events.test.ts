import { EDeviceType, ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import { DeviceType, TRANSPORT_EVENT } from '@onekeyfe/hd-transport';

import {
  cancel,
  initConnector,
  initCore,
  isDeviceIdentityMismatchError,
  isMissingDetectedProtocolV2Error,
  isRetryableBleConnectionError,
  isRetryableBleProtocolV2ProbeError,
  isTerminalBleStaleBondError,
  resolveBleConnectProtocol,
} from '../src/core';
import { DataManager } from '../src/data-manager';
import TransportManager from '../src/data-manager/TransportManager';
import { Device } from '../src/device/Device';
import { cancelDeviceInPrompt, cancelDeviceWithInitialize } from '../src/device/DeviceCommands';
import { DevicePool } from '../src/device/DevicePool';
import { CORE_EVENT, DEVICE, IFRAME } from '../src/events';
import { PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE } from '../src/protocols/protocol-v2';

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

  test('prefers Protocol V2 only when the method contract is explicitly V2-only', () => {
    const createMethod = (protocols: readonly ('V1' | 'V2')[], connectProtocol?: 'V1' | 'V2') =>
      ({
        payload: { connectProtocol },
        getSupportedProtocols: () => protocols,
      } as never);

    expect(resolveBleConnectProtocol(createMethod(['V2']))).toBe('V2');
    expect(resolveBleConnectProtocol(createMethod(['V1']))).toBeUndefined();
    expect(resolveBleConnectProtocol(createMethod(['V1', 'V2']))).toBeUndefined();
    expect(resolveBleConnectProtocol(createMethod(['V2'], 'V1'))).toBe('V1');
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

  test('isolates pending cancellation cleanup by connect id', () => {
    core = initCore();
    const context = (core as any).getCoreContext();
    const firstCleanup = createDeferred<void>();
    const replacementCleanup = createDeferred<void>();

    context.setPrePendingCallPromise('device-a', firstCleanup.promise);

    expect(context.getPrePendingCallPromise('device-a')).toBe(firstCleanup.promise);
    expect(context.getPrePendingCallPromise('device-b')).toBeUndefined();

    context.setPrePendingCallPromise('device-a', replacementCleanup.promise);
    context.removePrePendingCallPromise('device-a', firstCleanup.promise);

    expect(context.getPrePendingCallPromise('device-a')).toBe(replacementCleanup.promise);
  });

  test('cancels only requests associated with the requested connect id', () => {
    core = initCore();
    const context = (core as any).getCoreContext();
    const deviceA = {
      mainId: 'transport-session-a',
      getConnectId: jest.fn(() => 'serial-a'),
      interruptionFromUser: jest.fn().mockResolvedValue(undefined),
    };
    const deviceB = {
      mainId: 'device-b',
      getConnectId: jest.fn(() => 'serial-b'),
      interruptionFromUser: jest.fn().mockResolvedValue(undefined),
    };
    const taskA = context.requestQueue.createTask({
      responseID: 101,
      connectId: '',
      device: deviceA,
    } as never);
    const taskB = context.requestQueue.createTask({
      responseID: 102,
      connectId: 'device-b',
      device: deviceB,
    } as never);
    const signalA = taskA.abortController?.signal;
    const signalB = taskB.abortController?.signal;

    cancel(context, 'serial-a');

    expect(signalA?.aborted).toBe(true);
    expect(context.requestQueue.getTask(taskA.id)).toBeUndefined();
    expect(signalB?.aborted).toBe(false);
    expect(context.requestQueue.getTask(taskB.id)).toBe(taskB);
    expect(deviceA.interruptionFromUser).toHaveBeenCalledTimes(1);
    expect(deviceB.interruptionFromUser).not.toHaveBeenCalled();
  });

  test('aborts every request before cancel-all rejects WebUSB tasks', () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('webusb' as never);
    core = initCore();
    const context = (core as any).getCoreContext();
    const task = context.requestQueue.createTask({
      responseID: 103,
      connectId: 'webusb-device',
    } as never);
    const signal = task.abortController?.signal;

    cancel(context);

    expect(signal?.aborted).toBe(true);
    expect(context.requestQueue.getTask(task.id)).toBeUndefined();
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

  test('uses a verified cached protocol as a strict expected protocol', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = Device.fromDescriptor({
      id: 'ble-id',
      path: 'ble-id',
      commType: 'ble',
      protocolType: 'V1',
    } as never);
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-id', protocolType: 'V1' });
    device.deviceConnector = { acquire } as never;

    await device.acquire();

    expect(acquire).toHaveBeenCalledWith('ble-id', undefined, true, 'V1', undefined, undefined);
    expect(device.getProtocol()).toBe('V1');
    expect(device.originalDescriptor.protocolType).toBe('V1');
  });

  test('bypasses a cached protocol only for explicit active detection', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = Device.fromDescriptor({
      id: 'ble-id',
      path: 'ble-id',
      commType: 'ble',
      protocolType: 'V1',
    } as never);
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-id', protocolType: 'V2' });
    device.deviceConnector = { acquire } as never;

    await device.acquire(undefined, { forceProtocolDetection: true });

    // Explicit active detection forwards forceProtocolDetection so the
    // transport bypasses its protocol cache.
    expect(acquire).toHaveBeenCalledWith('ble-id', undefined, true, undefined, undefined, true);
    expect(device.getProtocol()).toBe('V2');
    expect(device.originalDescriptor.protocolType).toBe('V2');
  });

  test('does not reuse a stale protocol when active detection returns no protocol', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = Device.fromDescriptor({
      id: 'ble-id',
      path: 'ble-id',
      commType: 'ble',
      protocolType: 'V1',
    } as never);
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-id' });
    const release = jest.fn().mockResolvedValue(undefined);
    device.deviceConnector = { acquire, release } as never;
    await expect(
      device.acquire(undefined, {
        forceProtocolDetection: true,
        throwOnRunPromiseError: true,
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });
    expect(device.originalDescriptor.protocolType).toBe('V1');
    expect(device.hasDeviceAcquire()).toBe(false);
    expect(release).toHaveBeenCalledWith('ble-id', false);
  });

  test('actively reacquires an already connected device without initializing it', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('webusb' as never);
    const device = Device.fromDescriptor({
      id: 'usb-device',
      path: 'usb-device',
      session: 'old-session',
      protocolType: 'V1',
    } as never);
    device.mainId = 'old-session';
    device.commands = { disposed: false } as never;
    const release = jest.spyOn(device, 'release').mockImplementation(() => {
      device.mainId = null;
      device.originalDescriptor.session = null;
      device.commands.disposed = true;
      return Promise.resolve();
    });
    const acquire = jest.spyOn(device, 'acquire').mockImplementation(() => {
      device.mainId = 'new-session';
      device.originalDescriptor.session = 'new-session';
      device.originalDescriptor.protocolType = 'V2';
      device.commands.disposed = false;
      return Promise.resolve();
    });
    const initialize = jest.spyOn(device, 'initialize').mockResolvedValue(undefined);

    await device.run(() => Promise.resolve(undefined), {
      forceProtocolDetection: true,
      skipInitialize: true,
    });

    expect(release).toHaveBeenCalled();
    expect(acquire).toHaveBeenCalledWith(undefined, {
      forceProtocolDetection: true,
    });
    expect(initialize).not.toHaveBeenCalled();
    expect(device.getProtocol()).toBe('V2');
  });

  test('keeps the freshly probed React Native BLE session until the call completes', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = Device.fromDescriptor({
      id: 'ble-device',
      path: 'ble-device',
      commType: 'ble',
      protocolType: 'V1',
    } as never);
    device.mainId = 'ble-device';
    device.commands = { disposed: false } as never;
    (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;
    const release = jest.spyOn(device, 'release').mockResolvedValue(undefined);
    const run = jest.fn().mockResolvedValue(undefined);

    await device.run(run, {
      forceProtocolDetection: true,
      skipInitialize: true,
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  test('keeps an explicit connectProtocol as a strict expected protocol', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = Device.fromDescriptor({
      id: 'ble-id',
      path: 'ble-id',
      commType: 'ble',
      protocolType: 'V1',
    } as never);
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-id', protocolType: 'V2' });
    device.deviceConnector = { acquire } as never;

    await device.acquire('V2');

    expect(acquire).toHaveBeenCalledWith('ble-id', undefined, true, 'V2', undefined, undefined);
    expect(device.getProtocol()).toBe('V2');
  });

  test.each([
    ['V2', true],
    ['V1', false],
  ] as const)(
    'retries a missing detected protocol only for an explicit Protocol %s connection',
    (connectProtocol, expected) => {
      const method = { payload: { connectProtocol } } as never;
      const error = {
        errorCode: HardwareErrorCode.RuntimeError,
        message: 'Device protocol has not been detected for ble-id',
      };

      expect(isMissingDetectedProtocolV2Error(method, error)).toBe(expected);
    }
  );

  test.each([
    [HardwareErrorCode.RuntimeError, true],
    [HardwareErrorCode.BleDeviceBondError, false],
    [HardwareErrorCode.BlePeerRemovedPairingInformation, false],
  ] as const)(
    'retries a Protocol V2 probe mismatch with error code %s: %s',
    (errorCode, expected) => {
      const method = { payload: { connectProtocol: 'V2' } } as never;
      const error = {
        errorCode,
        message:
          'Device protocol mismatch: expected V2, but device did not respond to expected protocol',
      };

      expect(isRetryableBleProtocolV2ProbeError(method, error)).toBe(expected);
    }
  );

  test.each([
    [HardwareErrorCode.BleConnectedError, true],
    [HardwareErrorCode.BleTimeoutError, true],
    [HardwareErrorCode.PollingTimeout, false],
    [HardwareErrorCode.BleDeviceBondError, false],
    [HardwareErrorCode.BlePeerRemovedPairingInformation, false],
    [HardwareErrorCode.BleBondInvalid, false],
  ] as const)('retries a BLE connection error with error code %s: %s', (errorCode, expected) => {
    const method = { payload: { connectProtocol: 'V2' } } as never;
    const error = {
      errorCode,
      message: 'BLE setup wedged repeatedly',
    };

    expect(isRetryableBleConnectionError(method, error)).toBe(expected);
  });

  test('does not retry the desktop acquire deadline fallback', () => {
    const method = { payload: { connectProtocol: 'V2' } } as never;
    const error = {
      errorCode: HardwareErrorCode.BleTimeoutError,
      params: { acquireDeadlineExceeded: true },
    };

    expect(isRetryableBleConnectionError(method, error)).toBe(false);
  });

  test.each([
    [HardwareErrorCode.BleDeviceBondError, true],
    [HardwareErrorCode.BlePeerRemovedPairingInformation, true],
    [HardwareErrorCode.BleBondInvalid, true],
    [HardwareErrorCode.DeviceNotFound, false],
  ] as const)('treats BLE stale-bond error code %s as terminal: %s', (errorCode, expected) => {
    const error = {
      errorCode,
    };

    expect(isTerminalBleStaleBondError(error)).toBe(expected);
  });

  test.each([
    [HardwareErrorCode.DeviceCheckDeviceIdError, true],
    [HardwareErrorCode.DeviceNotFound, false],
  ] as const)('treats device identity error code %s as a mismatch: %s', (errorCode, expected) => {
    expect(isDeviceIdentityMismatchError({ errorCode })).toBe(expected);
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

  test.each([
    ['V2', 'Cancel', 'webusb'],
    ['V2', 'Cancel', 'desktop-web-ble'],
    ['V2', 'Cancel', 'react-native'],
    ['V1', 'Initialize', 'webusb'],
    ['V1', 'Cancel', 'desktop-web-ble'],
  ] as const)(
    'sends Protocol %s %s without treating the acquired %s session as disconnected',
    async (protocol, messageType, env) => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(env as never);
      const device = createInitializedDevice(protocol);
      const post = jest.fn().mockResolvedValue(undefined);
      const call = jest.fn().mockResolvedValue(undefined);
      const cancel = jest.fn().mockResolvedValue(undefined);
      device.originalDescriptor.session = device.mainId;
      (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;
      (device as any).commands = { transport: { post, call }, cancel };
      device.setCancelableAction(() =>
        messageType === 'Cancel'
          ? cancelDeviceInPrompt(device, false)
          : cancelDeviceWithInitialize(device)
      );

      await device.interruptionFromUser();

      if (messageType === 'Cancel') {
        expect(post).toHaveBeenCalledWith(device.mainId, 'Cancel', {});
        expect(call).not.toHaveBeenCalled();
      } else {
        expect(call).toHaveBeenCalledWith(device.mainId, 'Initialize', {});
        expect(post).not.toHaveBeenCalled();
      }
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(device.hasDeviceAcquire()).toBe(true);
    }
  );

  test.each(['react-native', 'webusb', 'desktop-webusb'] as const)(
    'sends a fallback Cancel for an acquired Protocol V2 %s call with an open UI',
    async env => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(env as never);
      const device = createInitializedDevice('V2');
      const post = jest.fn().mockResolvedValue(undefined);
      const cancelDevice = jest.fn(() => cancelDeviceInPrompt(device, false));
      const cancel = jest.fn().mockResolvedValue(undefined);
      device.originalDescriptor.session = device.mainId;
      (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;
      device.commands = {
        transport: { post },
        cancelDevice,
        cancel,
      } as never;
      device.createProtocolV2UiPhaseMetadata('button', 'start');

      await device.interruptionFromUser();

      expect(cancelDevice).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith(device.mainId, 'Cancel', {});
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  );

  test.each(['react-native', 'webusb', 'desktop-webusb'] as const)(
    'does not send Cancel for an acquired Protocol V2 %s connect without an open UI',
    async env => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(env as never);
      const device = createInitializedDevice('V2');
      const post = jest.fn().mockResolvedValue(undefined);
      const cancelDevice = jest.fn(() => cancelDeviceInPrompt(device, false));
      const cancel = jest.fn().mockResolvedValue(undefined);
      const disconnect = jest.fn().mockResolvedValue(undefined);
      device.originalDescriptor.session = device.mainId;
      (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;
      device.deviceConnector = { disconnect } as never;
      device.commands = {
        transport: { post },
        cancelDevice,
        cancel,
      } as never;

      await device.interruptionFromUser();

      expect(cancelDevice).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
      expect(disconnect).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  );

  test('disconnects a BLE link without sending Cancel when the session is not acquired', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = createInitializedDevice('V2');
    const post = jest.fn().mockResolvedValue(undefined);
    const cancelDevice = jest.fn(() => cancelDeviceInPrompt(device, false));
    const cancel = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn().mockResolvedValue(undefined);
    device.deviceConnector = { disconnect } as never;
    device.commands = {
      transport: { post },
      cancelDevice,
      cancel,
    } as never;

    await device.interruptionFromUser();

    expect(cancelDevice).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledWith(device.mainId);
    expect(device.hasDeviceAcquire()).toBe(false);
    expect(device.wasInterruptedByUser()).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  test('does not finish acquire after the user already cancelled', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = createInitializedDevice('V2');
    const disconnect = jest.fn().mockResolvedValue(undefined);
    let resolveAcquire: ((value: { uuid: string; protocolType: 'V2' }) => void) | undefined;
    const acquire = jest.fn(
      () =>
        new Promise<{ uuid: string; protocolType: 'V2' }>(resolve => {
          resolveAcquire = resolve;
        })
    );
    device.deviceConnector = { acquire, disconnect } as never;

    const acquirePromise = device.acquire('V2');
    await device.interruptionFromUser();
    resolveAcquire?.({ uuid: 'late-session', protocolType: 'V2' });

    await expect(acquirePromise).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInterruptedFromUser,
    });
    expect(disconnect).toHaveBeenCalledWith('late-session');
    expect(device.hasDeviceAcquire()).toBe(false);
  });

  test('does not retry a BLE connection error after the user cancelled', () => {
    const device = createInitializedDevice('V2');
    device.beginConnectionAttempt();
    (device as unknown as { interruptedAttempt: number }).interruptedAttempt = (
      device as unknown as { connectionAttempt: number }
    ).connectionAttempt;
    const method = { payload: { connectProtocol: 'V2' }, device } as never;
    const error = {
      errorCode: HardwareErrorCode.BleConnectedError,
      message: 'BLE setup wedged repeatedly',
    };

    expect(isRetryableBleConnectionError(method, error)).toBe(false);
  });

  test('keeps a user cancel across a later BLE poll iteration', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = createInitializedDevice('V2');
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const acquire = jest.fn().mockResolvedValue({ uuid: 'poll-session', protocolType: 'V2' });
    device.deviceConnector = { acquire, disconnect } as never;

    // First ensureConnected poll iteration.
    device.beginConnectionAttempt();
    await device.interruptionFromUser();
    expect(device.wasInterruptedByUser()).toBe(true);

    // A later poll must not call beginConnectionAttempt() again.
    await expect(device.acquire('V2')).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInterruptedFromUser,
    });
    expect(device.wasInterruptedByUser()).toBe(true);
    expect(acquire).not.toHaveBeenCalled();
  });

  test('allows a new BLE connect after the previous attempt was cancelled', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = createInitializedDevice('V2');
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const acquire = jest.fn().mockResolvedValue({ uuid: 'next-session', protocolType: 'V2' });
    device.deviceConnector = { acquire, disconnect } as never;

    device.beginConnectionAttempt();
    await device.interruptionFromUser();
    expect(device.wasInterruptedByUser()).toBe(true);

    device.beginConnectionAttempt();
    await expect(device.acquire('V2')).resolves.toBeUndefined();

    expect(device.wasInterruptedByUser()).toBe(false);
    expect(device.hasDeviceAcquire()).toBe(true);
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  test('discards a late cancelled acquire after a newer connect attempt starts', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = createInitializedDevice('V2');
    const disconnect = jest.fn().mockResolvedValue(undefined);
    let resolveAcquire: ((value: { uuid: string; protocolType: 'V2' }) => void) | undefined;
    const acquire = jest.fn(
      () =>
        new Promise<{ uuid: string; protocolType: 'V2' }>(resolve => {
          resolveAcquire = resolve;
        })
    );
    device.deviceConnector = { acquire, disconnect } as never;

    device.beginConnectionAttempt();
    const cancelledAcquire = device.acquire('V2');
    await device.interruptionFromUser();
    device.beginConnectionAttempt();
    resolveAcquire?.({ uuid: 'stale-session', protocolType: 'V2' });

    await expect(cancelledAcquire).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInterruptedFromUser,
    });
    expect(disconnect).toHaveBeenCalledWith('stale-session');
    expect(device.hasDeviceAcquire()).toBe(false);
    expect(device.wasInterruptedByUser()).toBe(false);
  });

  test('waits for the canceled run to finish releasing before cancellation completes', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    const device = createInitializedDevice('V2');
    const operation = createDeferred<void>();
    const releaseGate = createDeferred<void>();
    const cancelError = ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser);
    const release = jest.spyOn(device, 'release').mockImplementation(() => releaseGate.promise);
    device.commands = {
      disposed: false,
      cancel: jest.fn(() => {
        operation.reject(cancelError);
        return Promise.resolve();
      }),
    } as never;
    (device as unknown as { deviceAcquired: boolean }).deviceAcquired = true;

    const runResult = device.run(() => operation.promise).catch(error => error);
    const cancellation = device.interruptionFromUser();
    let cancellationCompleted = false;
    cancellation.then(() => {
      cancellationCompleted = true;
    });

    await new Promise(resolve => {
      setImmediate(resolve);
    });
    expect(release).toHaveBeenCalledTimes(1);
    expect(cancellationCompleted).toBe(false);

    releaseGate.resolve();
    await cancellation;
    await expect(runResult).resolves.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInterruptedFromUser,
    });
  });

  test.each([
    [EDeviceType.Pro2, 'webusb', false, DeviceType.PRO2],
    [EDeviceType.Neo, 'webusb', false, DeviceType.NEO],
    [EDeviceType.Pro2, 'desktop-web-ble', true, DeviceType.PRO2],
    [EDeviceType.Neo, 'desktop-web-ble', true, DeviceType.NEO],
    [EDeviceType.Pro2, 'react-native', true, DeviceType.PRO2],
    [EDeviceType.Neo, 'react-native', true, DeviceType.NEO],
    [EDeviceType.Pro2, 'lowlevel', false, DeviceType.PRO2],
  ] as const)(
    'refreshes %s runtime state after acquiring a fresh %s session',
    async (deviceType, env, isBle, protocolV2DeviceType) => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(env as never);
      const device = createInitializedDevice('V2');
      const staleProtocolInfo = {
        version: 1,
        build_fingerprint: 'bootloader__1.0.0__abcdef0__PROD__RELEASE',
        supported_messages: [],
      };
      const freshProtocolInfo = {
        version: 1,
        build_fingerprint: 'application__5.0.0__abcdef0__PROD__RELEASE',
        supported_messages: [PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE],
      };
      device.updateState(
        {
          identity: { deviceType },
          status: { mode: 'bootloader' },
          raw: { protocolV2ProtocolInfo: staleProtocolInfo },
        },
        'initialize'
      );
      const acquire = jest
        .fn()
        .mockResolvedValue(isBle ? { uuid: 'fresh-session', protocolType: 'V2' } : 'fresh-session');
      device.deviceConnector = { acquire } as never;

      await device.acquire('V2', { throwOnRunPromiseError: true });
      const typedCall = jest.fn().mockImplementation((requestType: string) => {
        if (requestType === 'DeviceInfoGet') {
          return {
            message: {
              protocol_version: 2,
              hw: { Device_type: protocolV2DeviceType, serial_no: 'SERIAL-001' },
              main_mcu: { application: { version: '5.0.0' } },
            },
          };
        }
        if (requestType === 'ProtocolInfoRequest') {
          return { message: freshProtocolInfo };
        }
        if (requestType === 'DeviceStatusGet') {
          return {
            message: { init_states: true, unlocked: true, device_id: 'wallet-device-id' },
          };
        }
        throw new Error(`Unexpected request: ${requestType}`);
      });
      device.commands.typedCall = typedCall as never;

      await device.initialize();

      expect(typedCall.mock.calls.map(callArgs => callArgs[0])).toEqual([
        'DeviceInfoGet',
        'ProtocolInfoRequest',
        'DeviceStatusGet',
      ]);
      expect(device.state?.status.mode).toBe('normal');
      expect(device.state?.identity.deviceType).toBe(deviceType);
      expect(device.hasDeviceAcquire()).toBe(true);
    }
  );

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
