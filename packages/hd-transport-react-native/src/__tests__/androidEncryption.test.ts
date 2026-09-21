import EventEmitter from 'events';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  ANDROID_ENCRYPTION_RESULT_TIMEOUT_MS,
  ANDROID_KEY_MISSING_GRACE_MS,
  ANDROID_SYSTEM_REPAIR_TIMEOUT_MS,
} from '../index';
import {
  HCI_PIN_OR_KEY_MISSING,
  stopBleEncryptionTracking,
  waitForAndroidLinkEncryption,
} from '../bleEncryption';
import { stopBleKeyMissingTracking } from '../bleKeyMissing';
import protocolV1Schema from './protocolV1SchemaFixture';

type EncryptionEvent = { id: string; status: number; enabled: boolean };

let mockSupported = true;
let mockPairResult: { bonded: boolean; bonding: boolean; initiated?: boolean } = {
  bonded: true,
  bonding: false,
  initiated: false,
};
let mockEmitEncryption: ((event: EncryptionEvent) => void) | undefined;
let mockEmitAclDisconnected: ((event: { id: string }) => void) | undefined;
let mockEmitKeyMissing: ((event: { id: string }) => void) | undefined;
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
    pairDevice: jest.fn(() => Promise.resolve(mockPairResult)),
    supportsDeviceKeyMissing: jest.fn(() => mockSupported),
    onDeviceKeyMissing: jest.fn((callback: (event: { id: string }) => void) => {
      mockEmitKeyMissing = callback;
      return () => {
        mockEmitKeyMissing = undefined;
      };
    }),
    supportsDeviceEncryptionChange: jest.fn(() => mockSupported),
    onDeviceEncryptionChange: jest.fn((callback: (event: EncryptionEvent) => void) => {
      mockEmitEncryption = callback;
      return () => {
        mockEmitEncryption = undefined;
      };
    }),
    onDeviceAclDisconnected: jest.fn((callback: (event: { id: string }) => void) => {
      mockEmitAclDisconnected = callback;
      return () => {
        mockEmitAclDisconnected = undefined;
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
const OTHER_UUID = 'E9:B9:F4:DD:DE:CD';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

const advance = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await flush();
};

const encrypted = (id = UUID) => mockEmitEncryption?.({ id, status: 0, enabled: true });
const keyMissing = (id = UUID) =>
  mockEmitEncryption?.({ id, status: HCI_PIN_OR_KEY_MISSING, enabled: false });

const settle = <T>(promise: Promise<T>) => {
  const outcome: { value?: T; error?: { errorCode?: unknown }; done: boolean } = { done: false };
  promise.then(
    value => {
      outcome.value = value;
      outcome.done = true;
    },
    error => {
      outcome.error = error;
      outcome.done = true;
    }
  );
  return outcome;
};

const waitFor = ({
  linkStartedAt = Date.now(),
  signal,
}: { linkStartedAt?: number; signal?: AbortSignal } = {}) =>
  settle(
    waitForAndroidLinkEncryption({
      deviceId: UUID,
      linkStartedAt,
      resultTimeoutMs: ANDROID_ENCRYPTION_RESULT_TIMEOUT_MS,
      repairTimeoutMs: ANDROID_SYSTEM_REPAIR_TIMEOUT_MS,
      keyMissingGraceMs: ANDROID_KEY_MISSING_GRACE_MS,
      signal,
    })
  );

describe('Android link encryption', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
    mockSupported = true;
    mockPairResult = { bonded: true, bonding: false, initiated: false };
  });

  afterEach(() => {
    stopBleEncryptionTracking();
    stopBleKeyMissingTracking();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('first result of a new link', () => {
    test('resolves when the stored bond encrypts the link', async () => {
      const outcome = waitFor();
      await flush();
      expect(outcome.done).toBe(false);

      encrypted();
      await flush();

      expect(outcome.value).toBe('encrypted');
    });

    test('uses a result that arrived before the wait started', async () => {
      const linkStartedAt = Date.now();
      waitFor({ linkStartedAt });
      await flush();
      encrypted();
      await flush();

      const outcome = waitFor({ linkStartedAt });
      await flush();

      expect(outcome.value).toBe('encrypted');
    });

    test('proceeds as before when no result arrives in time', async () => {
      const outcome = waitFor();
      await advance(ANDROID_ENCRYPTION_RESULT_TIMEOUT_MS - 1);
      expect(outcome.done).toBe(false);

      await advance(1);

      expect(outcome.value).toBe('unresolved');
    });

    test('does not wait when the platform cannot report the result', async () => {
      mockSupported = false;
      const outcome = waitFor();
      await flush();

      expect(outcome.value).toBe('unresolved');
    });

    test('proceeds when encryption fails for a reason other than a lost bond', async () => {
      const outcome = waitFor();
      await flush();
      mockEmitEncryption?.({ id: UUID, status: 0x08, enabled: false });
      await flush();

      expect(outcome.value).toBe('unresolved');
    });

    test('proceeds when the link drops before any result', async () => {
      const outcome = waitFor();
      await flush();
      mockEmitAclDisconnected?.({ id: UUID });
      await flush();

      expect(outcome.value).toBe('unresolved');
    });

    test('ignores results for another device', async () => {
      const outcome = waitFor();
      await flush();
      encrypted(OTHER_UUID);
      await flush();
      expect(outcome.done).toBe(false);

      encrypted(UUID.toLowerCase());
      await flush();

      expect(outcome.value).toBe('encrypted');
    });
  });

  describe('reused link', () => {
    test('does not wait on a link that is still up and was encrypted earlier', async () => {
      waitFor();
      await flush();
      encrypted();
      await advance(1000);

      const outcome = waitFor();
      await flush();

      expect(outcome.value).toBe('already-encrypted');
    });

    test('waits again once the earlier link has dropped', async () => {
      waitFor();
      await flush();
      encrypted();
      await advance(1000);
      mockEmitAclDisconnected?.({ id: UUID });
      await advance(1000);

      const outcome = waitFor();
      await flush();
      expect(outcome.done).toBe(false);

      keyMissing();
      await flush();

      expect(outcome.done).toBe(false);
    });
  });

  describe('lost bond', () => {
    test('holds until the system re-pairs on the same link', async () => {
      const outcome = waitFor();
      await flush();
      keyMissing();
      await advance(10_000);
      expect(outcome.done).toBe(false);

      encrypted();
      await flush();

      expect(outcome.value).toBe('re-paired');
    });

    test('reports an invalid bond when the system says re-pairing failed', async () => {
      const outcome = waitFor();
      await flush();
      keyMissing();
      await advance(5000);
      mockEmitKeyMissing?.({ id: UUID });
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleBondInvalid);
    });

    test('reports an invalid bond when the drop is followed by key missing', async () => {
      const outcome = waitFor();
      await flush();
      keyMissing();
      await advance(5000);
      mockEmitAclDisconnected?.({ id: UUID });
      await advance(ANDROID_KEY_MISSING_GRACE_MS - 100);
      mockEmitKeyMissing?.({ id: UUID });
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleBondInvalid);
    });

    test('reports a disconnect when the link drops without key missing', async () => {
      const outcome = waitFor();
      await flush();
      keyMissing();
      await advance(5000);
      mockEmitAclDisconnected?.({ id: UUID });
      await advance(ANDROID_KEY_MISSING_GRACE_MS);

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceDisconnected);
    });

    test('gives up when re-pairing never finishes', async () => {
      const outcome = waitFor();
      await flush();
      keyMissing();
      await advance(ANDROID_SYSTEM_REPAIR_TIMEOUT_MS);

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceNotBonded);
    });

    test('stops waiting when the transport is stopped', async () => {
      const controller = new AbortController();
      const outcome = waitFor({ signal: controller.signal });
      await flush();
      keyMissing();
      await flush();

      controller.abort();
      await flush();

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleDeviceDisconnected);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('acquire', () => {
    function createHarness() {
      const monitor = jest.fn(() => ({ remove: jest.fn() }));
      const writeCharacteristic = {
        uuid: '00000002-0000-1000-8000-00805f9b34fb',
        isWritableWithoutResponse: true,
        writeWithoutResponse: jest.fn(() => Promise.resolve()),
      };
      const notifyCharacteristic = {
        uuid: '00000003-0000-1000-8000-00805f9b34fb',
        isNotifiable: true,
        monitor,
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
        onDeviceDisconnected: jest.fn(() => ({ remove: jest.fn() })),
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
      return { transport, monitor, device };
    }

    /** Drives acquire up to the point where it waits for the link's encryption result. */
    async function reachGate(device: { characteristicsForService: jest.Mock }) {
      for (let i = 0; i < 100 && device.characteristicsForService.mock.calls.length === 0; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await advance(10);
      }
      expect(device.characteristicsForService).toHaveBeenCalled();
      await advance(10);
    }

    async function runUntil(done: () => boolean, maxMs = 2000) {
      for (let elapsed = 0; elapsed < maxMs && !done(); elapsed += 50) {
        // eslint-disable-next-line no-await-in-loop
        await advance(50);
      }
    }

    test('subscribes to notifications only after a bonded link is encrypted', async () => {
      const { transport, monitor, device } = createHarness();
      const outcome = settle(transport.acquire({ uuid: UUID, expectedProtocol: 'V1' }));
      await reachGate(device);
      await advance(ANDROID_ENCRYPTION_RESULT_TIMEOUT_MS / 2);
      expect(monitor).not.toHaveBeenCalled();

      encrypted();
      await runUntil(() => outcome.done);

      expect(outcome.error).toBeUndefined();
      expect(outcome.value).toEqual({ uuid: UUID, protocolType: 'V1' });
      expect(monitor).toHaveBeenCalledTimes(1);
      await transport.release(UUID, true);
    });

    test('keeps GATT idle while the system re-pairs a lost bond', async () => {
      const { transport, monitor, device } = createHarness();
      const outcome = settle(transport.acquire({ uuid: UUID, expectedProtocol: 'V1' }));
      await reachGate(device);
      keyMissing();
      await advance(8000);
      expect(monitor).not.toHaveBeenCalled();
      expect(outcome.done).toBe(false);

      encrypted();
      await runUntil(() => outcome.done);

      expect(outcome.value).toEqual({ uuid: UUID, protocolType: 'V1' });
      expect(monitor).toHaveBeenCalledTimes(1);
      await transport.release(UUID, true);
    });

    test('fails as an invalid bond when the system re-pairing fails', async () => {
      const { transport, monitor, device } = createHarness();
      const outcome = settle(transport.acquire({ uuid: UUID, expectedProtocol: 'V1' }));
      await reachGate(device);
      keyMissing();
      await advance(5000);
      mockEmitKeyMissing?.({ id: UUID });
      await runUntil(() => outcome.done);

      expect(outcome.error?.errorCode).toBe(HardwareErrorCode.BleBondInvalid);
      expect(monitor).not.toHaveBeenCalled();
    });

    test('does not wait for a bond created by this acquire', async () => {
      mockPairResult = { bonded: false, bonding: true, initiated: true };
      const { transport, monitor } = createHarness();
      const outcome = settle(transport.acquire({ uuid: UUID, expectedProtocol: 'V1' }));
      for (let i = 0; i < 100 && !mockEmitBondState; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await advance(10);
      }
      mockEmitBondState?.({
        id: UUID,
        advertising: {},
        bondState: { preState: 'BOND_BONDING', state: 'BOND_BONDED' },
      });
      await runUntil(() => outcome.done);

      expect(outcome.value).toEqual({ uuid: UUID, protocolType: 'V1' });
      expect(monitor).toHaveBeenCalledTimes(1);
      await transport.release(UUID, true);
    });

    test('reuses a link that notifications already worked on without waiting', async () => {
      const { transport, monitor, device } = createHarness();
      // No result arrives: the link was already up before tracking could observe it.
      const first = settle(transport.acquire({ uuid: UUID, expectedProtocol: 'V1' }));
      await reachGate(device);
      await advance(ANDROID_ENCRYPTION_RESULT_TIMEOUT_MS - 100);
      expect(monitor).not.toHaveBeenCalled();
      await runUntil(() => first.done);
      expect(first.value).toEqual({ uuid: UUID, protocolType: 'V1' });
      await transport.release(UUID, true);
      monitor.mockClear();
      device.characteristicsForService.mockClear();

      const second = settle(transport.acquire({ uuid: UUID, expectedProtocol: 'V1' }));
      await reachGate(device);

      expect(monitor).toHaveBeenCalledTimes(1);
      await runUntil(() => second.done);
      expect(second.value).toEqual({ uuid: UUID, protocolType: 'V1' });
      await transport.release(UUID, true);
    });
  });
});
