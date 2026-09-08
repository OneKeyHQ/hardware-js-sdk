import { EventEmitter } from 'events';
import { BleErrorCode, BleManager } from 'react-native-ble-plx';
import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  BLE_CONNECT_TIMEOUT_MANAGER_RESET_THRESHOLD,
  BLE_CONNECT_TIMEOUT_MS,
  BLE_GATT_SETUP_TIMEOUT_MS,
  BLE_SETUP_WEDGED_MESSAGE,
} from '../index';
import protocolV1Schema from './protocolV1SchemaFixture';

jest.mock(
  'react-native',
  () => ({
    Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios },
    PermissionsAndroid: {
      PERMISSIONS: {},
      RESULTS: {},
      request: jest.fn(),
      requestMultiple: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock('react-native-ble-plx', () => ({
  BleATTErrorCode: { InvalidHandle: 1, UnlikelyError: 14 },
  BleError: Error,
  BleErrorCode: {
    DeviceDisconnected: 201,
    OperationStartFailed: 601,
    DeviceMTUChangeFailed: 401,
    OperationCancelled: 2,
    OperationTimedOut: 3,
    DeviceAlreadyConnected: 203,
  },
  BleManager: jest.fn(),
  ScanMode: { LowLatency: 2 },
}));

jest.mock('@onekeyfe/react-native-ble-utils', () => ({
  __esModule: true,
  default: {
    getConnectedPeripherals: jest.fn(() => Promise.resolve([])),
    getBondedPeripherals: jest.fn(() => Promise.resolve([])),
    pairDevice: jest.fn(() => Promise.resolve()),
  },
}));

const UUID = 'stalled-connect-device';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

async function advanceUntil(settled: () => boolean, totalMs: number, stepMs = 250) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    jest.advanceTimersByTime(stepMs);
    // eslint-disable-next-line no-await-in-loop
    await flush();
    if (settled()) return;
  }
  throw new Error(`fake timers exhausted after ${totalMs}ms before the connect settled`);
}

/** A device whose native connect() never settles — the observed iOS failure mode. */
function createHarness(connectImpl: () => Promise<unknown>) {
  const connect = jest.fn(connectImpl);
  const writeCharacteristic = {
    uuid: '00000002-0000-1000-8000-00805f9b34fb',
    isWritableWithResponse: true,
  };
  const notifyCharacteristic = {
    uuid: '00000003-0000-1000-8000-00805f9b34fb',
    isNotifiable: true,
  };
  const device = {
    id: UUID,
    name: 'OneKey Classic',
    localName: 'OneKey Classic',
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(false)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    connect,
    discoverAllServicesAndCharacteristics: jest.fn(() => Promise.resolve()),
    characteristicsForService: jest.fn(() =>
      Promise.resolve([writeCharacteristic, notifyCharacteristic])
    ),
    services: jest.fn(() => Promise.resolve([])),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    connectToDevice: jest.fn(connectImpl),
    cancelTransaction: jest.fn(() => Promise.resolve()),
    cancelDeviceConnection: jest.fn(() => Promise.resolve()),
    onStateChange: jest.fn((listener: (state: string) => void) => {
      // Dispatch asynchronously: subscribeBleOn wires its own cleanup after
      // registering, so a synchronous callback would run before it is ready.
      setImmediate(() => listener('PoweredOn'));
      return { remove: jest.fn() };
    }),
    state: jest.fn(() => Promise.resolve('PoweredOn')),
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
  };
  (transport as any).blePlxManager = bleManager;
  transport.init(
    { debug: jest.fn(), error: jest.fn(), warn: jest.fn() } as any,
    new EventEmitter()
  );
  transport.configure(protocolV1Schema);
  return { transport, device, bleManager, connect };
}

describe('BLE connect timeout', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  test('waits for singleton destruction before creating the next manager', async () => {
    const { transport, bleManager } = createHarness(() => Promise.resolve());
    const destruction = createDeferred<void>();
    Object.assign(bleManager, { destroy: jest.fn(() => destruction.promise) });
    const createManager = jest.mocked(BleManager);
    createManager.mockClear();
    (transport as unknown as { resetPlxManager(): void }).resetPlxManager();
    const first = transport.getPlxManager();
    const second = transport.getPlxManager();
    await flush();
    expect(createManager).not.toHaveBeenCalled();
    destruction.resolve();
    expect(await first).toBe(await second);
    expect(createManager).toHaveBeenCalledTimes(1);
  });

  test('does not reuse a manager after asynchronous destruction fails', async () => {
    const { bleManager } = createHarness(() => Promise.resolve());
    let transport!: ReactNativeBleTransport;
    jest.isolateModules(() => {
      const { default: Transport } = jest.requireActual<typeof import('../index')>('../index');
      transport = new Transport({});
    });
    transport.blePlxManager = bleManager as never;
    const destruction = createDeferred<void>();
    Object.assign(bleManager, { destroy: jest.fn(() => destruction.promise) });
    (transport as unknown as { resetPlxManager(): void }).resetPlxManager();
    const result = transport.getPlxManager();
    const failure = expect(result).rejects.toMatchObject({
      errorCode: HardwareErrorCode.PollingTimeout,
    });
    destruction.reject(new Error('Native destruction failed'));
    await failure;
  });

  test('bounds reset waiting without letting a new transport bypass unfinished destruction', async () => {
    const { transport, bleManager } = createHarness(() => Promise.resolve());
    const destruction = createDeferred<void>();
    Object.assign(bleManager, { destroy: jest.fn(() => destruction.promise) });
    const createManager = jest.mocked(BleManager);
    createManager.mockClear();
    (transport as unknown as { resetPlxManager(): void }).resetPlxManager();
    const nextTransport = new ReactNativeBleTransport({});
    const result = nextTransport.getPlxManager().catch(error => error);
    await flush();
    jest.advanceTimersByTime(BLE_CONNECT_TIMEOUT_MS);
    await expect(result).resolves.toMatchObject({ errorCode: HardwareErrorCode.PollingTimeout });
    expect(createManager).not.toHaveBeenCalled();
    destruction.resolve();
    await nextTransport.getPlxManager();
    expect(createManager).toHaveBeenCalledTimes(1);
  });

  test('a native connect that never settles is bounded instead of blocking forever', async () => {
    // iOS applies its own connect timeout on a serial queue; when that queue is busy
    // the timeout never fires and acquire() blocks until the app-level 60s timeout.
    const { transport } = createHarness(
      () =>
        new Promise(() => {
          // never settles
        })
    );

    const errors: Array<{ errorCode?: unknown }> = [];
    let settled = false;
    transport.acquire({ uuid: UUID }).catch(e => {
      errors.push(e);
      settled = true;
    });
    await flush();

    await advanceUntil(() => settled, BLE_CONNECT_TIMEOUT_MS + 5000);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.BleConnectedError);
  });

  test('stop drains its scan and removes the timer before another transport scans', async () => {
    const { transport, bleManager } = createHarness(() => Promise.resolve());
    const nativeStop = createDeferred<void>();
    bleManager.stopDeviceScan.mockImplementation(() => nativeStop.promise);
    const scanned = transport.enumerate().catch(error => error);
    await flush();
    await flush();
    expect(bleManager.startDeviceScan).toHaveBeenCalledTimes(1);
    const stopping = transport.stop();
    expect(transport.stop()).toBe(stopping);
    let stopped = false;
    stopping.then(() => {
      stopped = true;
    });
    await flush();
    expect(stopped).toBe(false);
    nativeStop.resolve();
    await stopping;
    await expect(scanned).resolves.toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceDisconnected,
    });
    jest.advanceTimersByTime(transport.scanTimeout);
    await flush();
    expect(bleManager.stopDeviceScan).toHaveBeenCalledTimes(1);
    await expect(transport.getPlxManager()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceDisconnected,
    });
  });

  test('stop rejects a pending read and waits for native disconnection without destroying the shared manager', async () => {
    const { transport, bleManager } = createHarness(() => Promise.resolve());
    const nativeDisconnect = createDeferred<void>();
    bleManager.cancelDeviceConnection.mockImplementation(() => nativeDisconnect.promise);
    const destroy = jest.fn();
    Object.assign(bleManager, { destroy });
    const read = createDeferred<void>();
    transport.runPromise = read;
    Object.assign(transport, { runPromiseDeviceId: UUID });
    const readResult = read.promise.catch(error => error);
    let stopped = false;
    const stopping = transport.stop().then(() => {
      stopped = true;
    });
    await flush();
    await expect(readResult).resolves.toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceDisconnected,
    });
    expect(stopped).toBe(false);
    nativeDisconnect.resolve();
    await advanceUntil(() => stopped, 1000);
    await stopping;
    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledWith(UUID);
    expect(destroy).not.toHaveBeenCalled();
  });

  test('the connect budget leaves generous headroom over a healthy connect', () => {
    // Healthy connects finish in ~2-3s (the native budget is 3s); this backstop only
    // fires when the native timeout itself fails to.
    expect(BLE_CONNECT_TIMEOUT_MS).toBeGreaterThanOrEqual(6000);
    expect(BLE_CONNECT_TIMEOUT_MS).toBeLessThanOrEqual(12000);
  });

  test('a stalled connect is abandoned natively so the next attempt is not cancelled by it', async () => {
    const { transport, bleManager } = createHarness(
      () =>
        new Promise(() => {
          // never settles
        })
    );

    let settled = false;
    transport.acquire({ uuid: UUID }).catch(() => {
      settled = true;
    });
    await flush();
    await advanceUntil(() => settled, BLE_CONNECT_TIMEOUT_MS + 5000);

    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledWith(UUID);
  });

  test('repeated stalled connects recreate the BLE manager and stop with PollingTimeout', async () => {
    const { transport, bleManager } = createHarness(
      () =>
        new Promise(() => {
          // never settles
        })
    );
    const destroy = jest.fn();
    (bleManager as unknown as { destroy: jest.Mock }).destroy = destroy;
    const errors: Array<{ errorCode?: unknown; message?: unknown }> = [];

    for (let attempt = 0; attempt < BLE_CONNECT_TIMEOUT_MANAGER_RESET_THRESHOLD; attempt += 1) {
      let settled = false;
      transport.acquire({ uuid: UUID }).catch(error => {
        errors.push(error);
        settled = true;
      });
      // eslint-disable-next-line no-await-in-loop
      await flush();
      // eslint-disable-next-line no-await-in-loop
      await advanceUntil(() => settled, BLE_CONNECT_TIMEOUT_MS + 5000);
    }

    expect(destroy).toHaveBeenCalledTimes(1);
    expect((transport as unknown as { blePlxManager?: unknown }).blePlxManager).toBeUndefined();
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.BleConnectedError);
    expect(errors[1]).toMatchObject({
      errorCode: HardwareErrorCode.PollingTimeout,
      message: BLE_SETUP_WEDGED_MESSAGE,
    });
  });

  test('a recreated BLE manager starts with fresh timeout budgets for every device', () => {
    const { transport, bleManager } = createHarness(() => Promise.resolve());
    (bleManager as unknown as { destroy: jest.Mock }).destroy = jest.fn();
    (transport as any).connectionSetupTimeoutCounts.set('setup-device', 1);
    (transport as any).writeTimeoutCounts.set('write-device', 1);

    (transport as any).resetPlxManager();

    expect((transport as any).connectionSetupTimeoutCounts.size).toBe(0);
    expect((transport as any).writeTimeoutCounts.size).toBe(0);
  });

  test('native connect timeouts contribute to the same manager reset budget', async () => {
    const { transport, bleManager } = createHarness(() => Promise.resolve());
    const destroy = jest.fn();
    (bleManager as unknown as { destroy: jest.Mock }).destroy = destroy;
    const nativeTimeout = Object.assign(new Error('Operation timed out'), {
      errorCode: BleErrorCode.OperationTimedOut,
    });

    await expect(
      (transport as any).connectWithTimeout(UUID, () => Promise.reject(nativeTimeout))
    ).rejects.toBe(nativeTimeout);
    await expect(
      (transport as any).connectWithTimeout(UUID, () => Promise.reject(nativeTimeout))
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.PollingTimeout,
      message: BLE_SETUP_WEDGED_MESSAGE,
    });

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test('GATT discovery is bounded and abandons the native connection', async () => {
    const { transport, device, bleManager } = createHarness(() => Promise.resolve());
    device.discoverAllServicesAndCharacteristics.mockImplementation(
      () =>
        new Promise(() => {
          // never settles
        })
    );

    const errors: Array<{ errorCode?: unknown }> = [];
    let settled = false;
    (transport as any).resolveCharacteristicsWithTimeout(UUID, device).catch((error: unknown) => {
      errors.push(error as { errorCode?: unknown });
      settled = true;
    });
    await flush();
    await advanceUntil(() => settled, BLE_GATT_SETUP_TIMEOUT_MS + 5000);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.BleConnectedError);
    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledWith(UUID);
  });

  test('a successful GATT retry clears the timeout budget before an abandoned call settles', async () => {
    const { transport, device, bleManager } = createHarness(() => Promise.resolve());
    let resolveAbandonedDiscovery: (() => void) | undefined;
    device.discoverAllServicesAndCharacteristics
      .mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            resolveAbandonedDiscovery = resolve;
          })
      )
      .mockResolvedValueOnce(undefined);

    let firstSettled = false;
    (transport as any).resolveCharacteristicsWithTimeout(UUID, device).catch(() => {
      firstSettled = true;
    });
    await flush();
    await advanceUntil(() => firstSettled, BLE_GATT_SETUP_TIMEOUT_MS + 5000);

    await expect(
      (transport as any).resolveCharacteristicsWithTimeout(UUID, device)
    ).resolves.toMatchObject({
      writeCharacteristic: expect.any(Object),
      notifyCharacteristic: expect.any(Object),
    });

    resolveAbandonedDiscovery?.();
    await flush();

    expect(bleManager.cancelDeviceConnection).toHaveBeenCalledTimes(1);
    expect((transport as any).connectionSetupTimeoutCounts.has(UUID)).toBe(false);
  });
});
