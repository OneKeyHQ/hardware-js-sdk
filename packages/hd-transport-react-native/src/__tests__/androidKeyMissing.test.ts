import EventEmitter from 'events';

import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  ANDROID_KEY_MISSING_GRACE_MS,
  ANDROID_KEY_MISSING_LINK_WINDOW_MS,
} from '../index';
import { SYSTEM_BONDING_RESTART_WINDOW_MS, onDeviceBondState } from '../BleManager';
import { stopBleKeyMissingTracking } from '../bleKeyMissing';
import protocolV1Schema from './protocolV1SchemaFixture';

let mockKeyMissingSupported = true;
let mockEmitKeyMissing: ((event: { id?: string }) => void) | undefined;
let mockEmitBondState: ((peripheral: unknown) => void) | undefined;

jest.mock(
  'react-native',
  () => ({
    Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android },
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
    pairDevice: jest.fn(() => Promise.resolve({ bonded: true, bonding: false })),
    supportsDeviceKeyMissing: jest.fn(() => mockKeyMissingSupported),
    onDeviceKeyMissing: jest.fn((callback: (event: { id?: string }) => void) => {
      mockEmitKeyMissing = callback;
      return () => {
        mockEmitKeyMissing = undefined;
      };
    }),
    onDeviceBondState: jest.fn((callback: (peripheral: unknown) => void) => {
      mockEmitBondState = callback;
      return () => {
        mockEmitBondState = undefined;
      };
    }),
  },
}));

const UUID = 'CC:06:1C:FD:48:E9';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

const advance = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await flush();
};

// What ble-plx reports when the device drops the link while the first write is queued.
const peerTerminated = () =>
  Promise.reject(
    Object.assign(new Error(`Device ${UUID} was disconnected`), {
      errorCode: 201,
      attErrorCode: 19,
      reason: 'Disconnected with status 19 (GATT_CONN_TERMINATE_PEER_USER)',
    })
  );

function createConnectedTransport(linkAgeMs = 0) {
  const t = new ReactNativeBleTransport({});
  t.configure(protocolV1Schema);
  (t as any).deviceProtocol.set(UUID, 'V1');
  (t as any).getCachedTransport = () => ({
    writeCharacteristic: { writeWithoutResponse: jest.fn(peerTerminated) },
  });
  (t as any).androidLinkStartedAt.set(UUID, Date.now() - linkAgeMs);
  return t;
}

const settle = (promise: Promise<unknown>) => {
  const outcome: { error?: { errorCode?: unknown }; done: boolean } = { done: false };
  promise.then(
    () => {
      outcome.done = true;
    },
    error => {
      outcome.error = error;
      outcome.done = true;
    }
  );
  return outcome;
};

describe('Android key missing', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
    mockKeyMissingSupported = true;
  });

  afterEach(() => {
    stopBleKeyMissingTracking();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('link dropped right after connect', () => {
    test('reports an invalid bond when the system says the keys are missing', async () => {
      const outcome = settle(createConnectedTransport().call(UUID, 'GetFeatures', {}));
      await flush();
      // The broadcast is delivered separately and can trail the GATT disconnect.
      mockEmitKeyMissing?.({ id: UUID.toLowerCase() });
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleBondInvalid);
    });

    test('keeps the original error when no key missing follows', async () => {
      const outcome = settle(createConnectedTransport().call(UUID, 'GetFeatures', {}));
      await flush();
      expect(outcome.done).toBe(false);

      await advance(ANDROID_KEY_MISSING_GRACE_MS);

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });

    test('ignores key missing reported for an earlier link', async () => {
      const transport = createConnectedTransport();
      const earlier = settle(transport.call(UUID, 'GetFeatures', {}));
      await flush();
      mockEmitKeyMissing?.({ id: UUID });
      await flush();
      expect(earlier.error?.errorCode).toBe(HardwareErrorCode.BleBondInvalid);

      // The user re-paired; a later link that drops is an ordinary disconnect.
      await advance(1000);
      (transport as any).androidLinkStartedAt.set(UUID, Date.now());
      const later = settle(transport.call(UUID, 'GetFeatures', {}));
      await flush();
      await advance(ANDROID_KEY_MISSING_GRACE_MS);

      expect(later.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });

    test('ignores key missing for another device', async () => {
      const outcome = settle(createConnectedTransport().call(UUID, 'GetFeatures', {}));
      await flush();
      mockEmitKeyMissing?.({ id: 'E9:B9:F4:DD:DE:CD' });
      await advance(ANDROID_KEY_MISSING_GRACE_MS);

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });

    test('does not wait on a link that has been up for a while', async () => {
      const transport = createConnectedTransport(ANDROID_KEY_MISSING_LINK_WINDOW_MS + 1);
      const outcome = settle(transport.call(UUID, 'GetFeatures', {}));
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });

    test('does not wait when the OS or native build never reports key missing', async () => {
      mockKeyMissingSupported = false;
      const outcome = settle(createConnectedTransport().call(UUID, 'GetFeatures', {}));
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });
  });

  describe('acquire over a bond the device no longer holds', () => {
    // Android still reports BONDED, so connect, MTU and GATT setup all succeed and the
    // protocol probe is the first operation to meet the dropped link.
    function createStaleBondHarness() {
      const writeCharacteristic = {
        uuid: '00000002-0000-1000-8000-00805f9b34fb',
        isWritableWithoutResponse: true,
        writeWithoutResponse: jest.fn(peerTerminated),
      };
      const notifyCharacteristic = {
        uuid: '00000003-0000-1000-8000-00805f9b34fb',
        isNotifiable: true,
        monitor: jest.fn(() => ({ remove: jest.fn() })),
      };
      const device = {
        id: UUID,
        name: 'Pro 2 48E9',
        localName: 'Pro 2 48E9',
        mtu: 247,
        serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
        isConnected: jest.fn(() => Promise.resolve(true)),
        cancelConnection: jest.fn(() => Promise.resolve()),
        discoverAllServicesAndCharacteristics: jest.fn(() => Promise.resolve()),
        characteristicsForService: jest.fn(() =>
          Promise.resolve([writeCharacteristic, notifyCharacteristic])
        ),
        services: jest.fn(() => Promise.resolve([])),
        onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
      };
      const transport = new ReactNativeBleTransport({});
      (transport as any).blePlxManager = {
        devices: jest.fn(() => Promise.resolve([device])),
        connectedDevices: jest.fn(() => Promise.resolve([])),
        cancelTransaction: jest.fn(() => Promise.resolve()),
        cancelDeviceConnection: jest.fn(() => Promise.resolve()),
        onStateChange: jest.fn((listener: (state: string) => void) => {
          setImmediate(() => listener('PoweredOn'));
          return { remove: jest.fn() };
        }),
        state: jest.fn(() => Promise.resolve('PoweredOn')),
      };
      transport.init(
        { debug: jest.fn(), error: jest.fn(), warn: jest.fn() } as any,
        new EventEmitter()
      );
      transport.configure(protocolV1Schema);
      return { transport, write: writeCharacteristic.writeWithoutResponse };
    }

    async function acquireUntilSettled(keyMissing: boolean) {
      const { transport, write } = createStaleBondHarness();
      const outcome = settle(transport.acquire({ uuid: UUID }));
      for (let i = 0; i < 100 && !outcome.done; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await advance(100);
        // The broadcast follows the dropped link, which the probe write is first to meet.
        if (keyMissing && write.mock.calls.length > 0) mockEmitKeyMissing?.({ id: UUID });
      }
      expect(write).toHaveBeenCalled();
      return JSON.parse(JSON.stringify(ERRORS.serializeError({ error: outcome.error })));
    }

    test('ends as an invalid bond that survives the Core response path', async () => {
      await expect(acquireUntilSettled(true)).resolves.toEqual({
        code: HardwareErrorCode.BleBondInvalid,
        error: expect.stringContaining('Forget the device'),
        params: { phase: 'connect', reason: 'key_missing' },
      });
    });

    test('keeps the legacy error when the system reports nothing', async () => {
      await expect(acquireUntilSettled(false)).resolves.toMatchObject({
        code: HardwareErrorCode.BleDeviceNotBonded,
      });
    });
  });

  describe('waiting for bonding', () => {
    const bondState = (preState: string, state: string) =>
      mockEmitBondState?.({ id: UUID, bondState: { preState, state } });

    test('fails as an invalid bond when the system re-pair ends in key missing', async () => {
      const outcome = settle(onDeviceBondState(UUID, undefined, { systemInitiated: true }));
      mockEmitKeyMissing?.({ id: UUID });
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleBondInvalid);
    });

    test('follows a system re-pair that replaces the bond', async () => {
      const outcome = settle(onDeviceBondState(UUID, undefined, { systemInitiated: true }));
      bondState('BOND_BONDING', 'BOND_NONE');
      bondState('BOND_NONE', 'BOND_BONDING');
      await advance(SYSTEM_BONDING_RESTART_WINDOW_MS);
      expect(outcome.done).toBe(false);

      bondState('BOND_BONDING', 'BOND_BONDED');
      await flush();

      expect(outcome.done).toBe(true);
      expect(outcome.error).toBeUndefined();
    });

    test('fails a system re-pair that ends without a bond', async () => {
      const outcome = settle(onDeviceBondState(UUID, undefined, { systemInitiated: true }));
      bondState('BOND_BONDING', 'BOND_NONE');
      await flush();
      expect(outcome.done).toBe(false);

      await advance(SYSTEM_BONDING_RESTART_WINDOW_MS);

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });

    test('fails a bonding this transport started as soon as it ends without a bond', async () => {
      const outcome = settle(onDeviceBondState(UUID));
      bondState('BOND_BONDING', 'BOND_NONE');
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });
  });
});
