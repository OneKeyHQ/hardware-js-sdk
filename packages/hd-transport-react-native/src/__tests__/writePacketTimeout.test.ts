import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  BLE_WRITE_PACKET_TIMEOUT_MS,
  BLE_WRITE_TIMEOUT_MANAGER_RESET_THRESHOLD,
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

const UUID = 'wedged-write-device';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

/** Drive fake timers forward in slices until `settled()` reports done. */
async function advanceUntil(settled: () => boolean, totalMs: number, stepMs = 500) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    jest.advanceTimersByTime(stepMs);
    // eslint-disable-next-line no-await-in-loop
    await flush();
    if (settled()) return;
  }
  throw new Error(`fake timers exhausted after ${totalMs}ms before the call settled`);
}

/** Drive fake timers forward without requiring the work to settle. */
async function drain(totalMs: number, stepMs = 500) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    jest.advanceTimersByTime(stepMs);
    // eslint-disable-next-line no-await-in-loop
    await flush();
  }
}

function createHarness(writeImpl: () => Promise<void>) {
  const t = new ReactNativeBleTransport({});
  t.configure(protocolV1Schema);
  (t as any).deviceProtocol.set(UUID, 'V1');
  const writeWithoutResponse = jest.fn(writeImpl);
  const fakeBleTransport = {
    writeCharacteristic: { writeWithoutResponse },
    writeWithRetry: jest.fn(writeImpl),
  };
  (t as any).getCachedTransport = () => fakeBleTransport;
  const disconnectSpy = jest.spyOn(t, 'disconnect').mockResolvedValue(undefined);
  return { t, disconnectSpy, writeWithoutResponse };
}

describe('BLE packet write timeout', () => {
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

  test('a never-settling write rejects instead of hanging the call forever', async () => {
    // iOS never resolves writeWithoutResponse when the peripheral stops reporting
    // "ready to send"; without a bounded write the response timeout is never armed.
    const { t } = createHarness(
      () =>
        new Promise<void>(() => {
          // never settles
        })
    );

    const errors: Array<{ errorCode?: unknown }> = [];
    let settled = false;
    const call = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    call.catch(e => {
      errors.push(e);
      settled = true;
    });
    await flush();

    await advanceUntil(() => settled, 30000);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.BleWriteCharacteristicError);
  });

  test('a wedged write tears the BLE link down so the next call reconnects', async () => {
    const { t, disconnectSpy } = createHarness(
      () =>
        new Promise<void>(() => {
          // never settles
        })
    );

    let settled = false;
    const call = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    call.catch(() => {
      settled = true;
    });
    await flush();

    await advanceUntil(() => settled, 30000);

    expect(disconnectSpy).toHaveBeenCalledWith(UUID);
  });

  test('the write budget is per packet, not per call', async () => {
    // Five packets at 4s each: the call's write phase far outlives one packet budget,
    // but no single packet does, so nothing may be torn down.
    const { t, disconnectSpy, writeWithoutResponse } = createHarness(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 4000);
        })
    );

    const errors: Array<{ errorCode?: unknown }> = [];
    let settled = false;
    const call = t.call(UUID, 'Ping', { message: 'x'.repeat(300) }, { timeoutMs: 120000 });
    call.catch(e => {
      errors.push(e);
      settled = true;
    });
    await flush();

    await advanceUntil(() => settled, 200000);

    // Every packet was written: none was aborted even though the write phase as a
    // whole ran far past a single packet budget.
    expect(writeWithoutResponse.mock.calls.length).toBeGreaterThan(1);
    expect(4000 * writeWithoutResponse.mock.calls.length).toBeGreaterThan(
      BLE_WRITE_PACKET_TIMEOUT_MS
    );
    // Fails on the RESPONSE timeout the device never answered, not on a write timeout.
    expect(errors[0]?.errorCode).toBe(HardwareErrorCode.BleTimeoutError);
  });

  test('a superseded call whose write wedges must not tear down the successor link', async () => {
    // Only the first call's write wedges; the successor writes normally.
    let writes = 0;
    const { t, disconnectSpy } = createHarness(() => {
      writes += 1;
      return writes === 1
        ? new Promise<void>(() => {
            // never settles
          })
        : Promise.resolve();
    });

    const first = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    first.catch(() => undefined);
    await flush();

    // A forceRun call supersedes it and becomes the transport owner.
    const second = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
    second.catch(() => undefined);
    await flush();

    await drain(BLE_WRITE_PACKET_TIMEOUT_MS + 2000);

    expect(disconnectSpy).not.toHaveBeenCalled();
    expect(t.runPromise).not.toBeNull();
  });

  test('repeated wedged writes recreate the BLE manager', async () => {
    const { t, disconnectSpy } = createHarness(
      () =>
        new Promise<void>(() => {
          // never settles
        })
    );
    const destroy = jest.fn();
    (t as any).blePlxManager = { destroy };

    for (let attempt = 0; attempt < BLE_WRITE_TIMEOUT_MANAGER_RESET_THRESHOLD; attempt += 1) {
      (t as any).deviceProtocol.set(UUID, 'V1');
      let settled = false;
      const call = t.call(UUID, 'Initialize', {}, { timeoutMs: 25000 });
      call.catch(() => {
        settled = true;
      });
      // eslint-disable-next-line no-await-in-loop
      await flush();
      // eslint-disable-next-line no-await-in-loop
      await advanceUntil(() => settled, BLE_WRITE_PACKET_TIMEOUT_MS + 2000);
    }

    expect(disconnectSpy).toHaveBeenCalledTimes(BLE_WRITE_TIMEOUT_MANAGER_RESET_THRESHOLD);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect((t as any).blePlxManager).toBeUndefined();
  });

  test('slow but progressing writes are not aborted', async () => {
    // Each packet takes a while but keeps completing: this must not be mistaken
    // for a wedged link, even when the whole call outlives a single packet budget.
    const { t, writeWithoutResponse } = createHarness(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 4000);
        })
    );

    const errors: unknown[] = [];
    let settled = false;
    const call = t.call(UUID, 'Initialize', {}, { timeoutMs: 60000 });
    call.catch(e => {
      errors.push(e);
      settled = true;
    });
    await flush();

    // Let every packet drain; the call then waits for a device response that never
    // comes, and must fail with the RESPONSE timeout, not a write timeout.
    await advanceUntil(() => settled, 90000);

    expect(writeWithoutResponse).toHaveBeenCalled();
    expect(errors).toHaveLength(1);
    expect((errors[0] as { errorCode?: unknown })?.errorCode).toBe(
      HardwareErrorCode.BleTimeoutError
    );
  });
});

describe('protocol probe state visibility', () => {
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

  test('an in-flight probe does not publish its protocol as confirmed', async () => {
    const { t } = createHarness(
      () =>
        new Promise<void>(() => {
          // never settles
        })
    );
    (t as any).deviceProtocol.delete(UUID);

    const probe = (t as any).probeProtocolV1(UUID) as Promise<boolean>;
    probe.catch(() => undefined);
    await flush();

    // The call itself must still route as V1 while probing...
    expect(t.getProtocolType(UUID)).toBe('V1');
    // ...but acquire's cached-transport reuse gate must not treat it as detected.
    expect((t as any).deviceProtocol.get(UUID)).toBeUndefined();

    await drain(BLE_WRITE_PACKET_TIMEOUT_MS + 2000);
  });

  test('a probe that confirms its protocol leaves no probing entry behind', async () => {
    const { t } = createHarness(() => Promise.resolve());
    (t as any).deviceProtocol.delete(UUID);

    const probe = (t as any).probeProtocolV1(UUID) as Promise<boolean>;
    probe.catch(() => undefined);
    await flush();
    // The device answers the probe.
    t.runPromise?.resolve('deadbeef');
    await flush();

    expect((t as any).probingProtocols.size).toBe(0);
  });
});
