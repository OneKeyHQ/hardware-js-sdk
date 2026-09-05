import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport from '../index';
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
  BleATTErrorCode: { InvalidHandle: 1 },
  BleError: Error,
  BleErrorCode: { DeviceDisconnected: 201, OperationStartFailed: 601 },
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

const UUID = 'stale-timeout-device';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

function createHarness() {
  const t = new ReactNativeBleTransport({});
  t.configure(protocolV1Schema);
  (t as any).deviceProtocol.set(UUID, 'V1');
  const writeWithoutResponse = jest.fn(() => Promise.resolve());
  const fakeBleTransport = {
    writeCharacteristic: { writeWithoutResponse },
    writeWithRetry: jest.fn(() => Promise.resolve()),
  };
  (t as any).getCachedTransport = () => fakeBleTransport;
  const disconnectSpy = jest.spyOn(t, 'disconnect').mockResolvedValue(undefined);
  return { t, disconnectSpy, writeWithoutResponse };
}

describe('Protocol V1 stale call timeout', () => {
  test('settles a cancelled read and waits for native teardown before completing cancel', async () => {
    const { t, disconnectSpy } = createHarness();
    let finishDisconnect!: () => void;
    disconnectSpy.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishDisconnect = resolve;
        })
    );
    const call = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    const result = call.catch(error => error);
    await flush();
    let cancelled = false;
    const cleanup = t.cancel().then(() => {
      cancelled = true;
    });
    await flush();
    expect(await result).toMatchObject({ errorCode: HardwareErrorCode.CallQueueActionCancelled });
    expect(t.runPromise).toBeNull();
    expect(disconnectSpy).toHaveBeenCalledWith(UUID);
    expect(cancelled).toBe(false);
    finishDisconnect();
    await cleanup;
    jest.advanceTimersByTime(25000);
    await flush();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

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

  test('superseded Initialize timeout does not tear down the shared transport', async () => {
    const { t, disconnectSpy } = createHarness();

    // Initialize #1: written while the device reboots, never answered.
    const firstErrors: unknown[] = [];
    const first = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    first.catch(e => firstErrors.push(e));
    await flush();

    // Initialize #2 (forceRun) supersedes #1 three seconds later.
    jest.advanceTimersByTime(3000);
    const secondErrors: unknown[] = [];
    const second = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    second.catch(e => secondErrors.push(e));
    await flush();

    // The device answers Initialize #2 (settle its deferred at the transport seam).
    expect(t.runPromise).not.toBeNull();
    t.runPromise?.reject(new Error('settled by device response'));
    await flush();

    // FirmwareUpload is now the active call on the same transport, awaiting its response.
    const uploadErrors: unknown[] = [];
    const upload = t.call(UUID, 'FirmwareUpload', { payload: Buffer.alloc(300) });
    upload.catch(e => uploadErrors.push(e));
    await flush();
    jest.advanceTimersByTime(100); // firmware upload flush delay
    await flush();

    // Initialize #1's 25s response timer elapses while the upload is in flight.
    jest.advanceTimersByTime(25000);
    await flush();

    expect(disconnectSpy).not.toHaveBeenCalled();
    expect(firstErrors).toHaveLength(1);
    expect(uploadErrors).toHaveLength(0);
  });

  test('forceRun supersede settles the previous pending call immediately', async () => {
    const { t } = createHarness();

    const firstErrors: Array<{ errorCode?: unknown }> = [];
    const first = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    first.catch(e => firstErrors.push(e));
    await flush();

    const second = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    second.catch(() => undefined);
    await flush();

    expect(firstErrors).toHaveLength(1);
    expect(firstErrors[0]?.errorCode).toBe(HardwareErrorCode.BleForceCleanRunPromise);

    t.runPromise?.reject(new Error('settle second call'));
    await flush();
  });

  test('late write failure of a superseded call keeps the successor as owner', async () => {
    const { t, disconnectSpy } = createHarness();

    // First call's write hangs; its promise is controlled by the test.
    let rejectFirstWrite: ((e: Error) => void) | undefined;
    const fakeBleTransport = {
      writeCharacteristic: {
        writeWithoutResponse: jest
          .fn()
          .mockImplementationOnce(
            () =>
              new Promise((_resolve, reject) => {
                rejectFirstWrite = reject;
              })
          )
          .mockImplementation(() => Promise.resolve()),
      },
      writeWithRetry: jest.fn(() => Promise.resolve()),
    };
    (t as any).getCachedTransport = () => fakeBleTransport;

    const firstErrors: unknown[] = [];
    const first = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    first.catch(e => firstErrors.push(e));
    await flush();

    // forceRun successor takes ownership while the first call is stuck writing.
    const secondErrors: unknown[] = [];
    const second = t.call(UUID, 'Initialize', {}, { timeoutMs: 5000 });
    second.catch(e => secondErrors.push(e));
    await flush();

    // The first call's write now fails late; it must not clear the successor's slot.
    rejectFirstWrite?.(new Error('late write failure'));
    await flush();

    expect(t.runPromise).not.toBeNull();

    // The successor's genuine timeout must still tear the connection down.
    jest.advanceTimersByTime(5000);
    await flush();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(secondErrors).toHaveLength(1);
  });

  test('a cancelled read cannot disconnect a later transport when its old deadline passes', async () => {
    const { t, disconnectSpy } = createHarness();

    const errors: Array<{ errorCode?: unknown }> = [];
    const p = t.call(UUID, 'GetFeatures', {}, { timeoutMs: 5000 });
    p.catch(e => errors.push(e));
    await flush();

    await t.cancel();
    await flush();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    disconnectSpy.mockClear();

    jest.advanceTimersByTime(5000);
    await flush();

    expect(disconnectSpy).not.toHaveBeenCalled();
    expect(errors).toHaveLength(1);
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.CallQueueActionCancelled);
  });

  test('timeout on the active call still disconnects the transport', async () => {
    const { t, disconnectSpy } = createHarness();

    const errors: Array<{ errorCode?: unknown }> = [];
    const p = t.call(UUID, 'GetFeatures', {}, { timeoutMs: 5000 });
    p.catch(e => errors.push(e));
    await flush();

    jest.advanceTimersByTime(5000);
    await flush();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.BleTimeoutError);
  });
});
