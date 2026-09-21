import EventEmitter from 'events';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
  BLE_CONNECT_TIMEOUT_MS,
  IOS_PRESENT_DEVICE_CONNECT_BACKSTOP_MS,
  IOS_PRESENT_DEVICE_CONNECT_TIMEOUT_MS,
  IOS_PRESENT_DEVICE_WINDOW_MS,
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
    pairDevice: jest.fn(() => Promise.resolve({ bonded: true, bonding: false })),
    onDeviceBondState: jest.fn(),
  },
}));

const UUID = '554820A1-9DE5-8240-DC4F-38D156399D6B';
const NATIVE_CONNECT_TIMEOUT_MS = 3000;
/** Measured on an iPhone XR: iOS names the lost bond a little after the 3s native budget. */
const IOS_LOST_BOND_VERDICT_MS = 3200;

type ConnectOptions = { timeout?: number };

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

function createHarness() {
  const advertised = {
    id: UUID,
    name: 'Neo 5284',
    localName: 'Neo 5284',
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
  };
  const connectOptions: ConnectOptions[] = [];
  /**
   * A device whose bond the phone still holds. iOS fails the connect with
   * CBErrorPeerRemovedPairingInformation once it has tried the stored key; ble-plx cancels the
   * attempt first when its own budget is shorter.
   */
  const connectToLostBond = (options: ConnectOptions = {}) => {
    connectOptions.push(options);
    return new Promise((_, reject) => {
      const budget = options.timeout ?? Number.POSITIVE_INFINITY;
      if (budget < IOS_LOST_BOND_VERDICT_MS) {
        setTimeout(
          () => reject(Object.assign(new Error('Operation timed out'), { errorCode: 3 })),
          budget
        );
        return;
      }
      setTimeout(
        () =>
          reject(
            Object.assign(new Error(`Device ${UUID} connection failed`), {
              errorCode: 200,
              iosErrorCode: 14,
              reason: 'Peer removed pairing information',
            })
          ),
        IOS_LOST_BOND_VERDICT_MS
      );
    });
  };
  const device = {
    ...advertised,
    isConnected: jest.fn(() => Promise.resolve(false)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    connect: jest.fn(connectToLostBond),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  };
  let scanListener: ((error: unknown, device: unknown) => void) | undefined;
  const bleManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    connectToDevice: jest.fn((_id: string, options?: ConnectOptions) => connectToLostBond(options)),
    cancelTransaction: jest.fn(() => Promise.resolve()),
    cancelDeviceConnection: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    onStateChange: jest.fn((listener: (state: string) => void) => {
      setImmediate(() => listener('PoweredOn'));
      return { remove: jest.fn() };
    }),
    state: jest.fn(() => Promise.resolve('PoweredOn')),
    startDeviceScan: jest.fn(
      (_uuids: unknown, _options: unknown, listener: typeof scanListener) => {
        scanListener = listener;
      }
    ),
    stopDeviceScan: jest.fn(),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  (transport as any).blePlxManager = bleManager;
  const logger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn() };
  transport.init(logger as any, new EventEmitter());
  transport.configure(protocolV1Schema);

  /** One scan window in which the device advertises. */
  const scan = async () => {
    const pending = transport.enumerate();
    for (let i = 0; i < 50 && !scanListener; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    scanListener?.(null, advertised);
    for (let i = 0; i < 50; i += 1) {
      jest.advanceTimersByTime(100);
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    scanListener = undefined;
    await pending;
  };

  return { transport, connectOptions, scan, logger };
}

/** Runs one acquire to its end, moving the fake clock past every wait on the way. */
async function acquire(transport: ReactNativeBleTransport, input: Record<string, unknown> = {}) {
  let outcome: { code?: unknown; message?: string } | undefined;
  transport.acquire({ uuid: UUID, ...input } as never).then(
    () => {
      outcome = {};
    },
    error => {
      const { code, error: message } = ERRORS.serializeError({ error });
      outcome = { code, message };
    }
  );
  for (let i = 0; i < 600 && !outcome; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await flush();
    if (!outcome) jest.advanceTimersByTime(100);
  }
  if (!outcome) throw new Error('acquire did not settle');
  return outcome;
}

describe('iOS connect to a device that was just seen advertising', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance', 'nextTick'] });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('waits long enough for iOS to name the lost bond', async () => {
    const { transport, connectOptions, scan } = createHarness();
    await scan();

    await expect(acquire(transport)).resolves.toMatchObject({
      code: HardwareErrorCode.BlePeerRemovedPairingInformation,
    });
    expect(connectOptions).toEqual([
      expect.objectContaining({ timeout: IOS_PRESENT_DEVICE_CONNECT_TIMEOUT_MS }),
    ]);
  });

  test('without a sighting the short budget ends as a setup timeout, not a lost bond', async () => {
    const { transport, connectOptions } = createHarness();

    const first = await acquire(transport);
    const second = await acquire(transport);

    expect(connectOptions.map(options => options.timeout)).toEqual([
      NATIVE_CONNECT_TIMEOUT_MS,
      NATIVE_CONNECT_TIMEOUT_MS,
    ]);
    expect(first.code).not.toBe(HardwareErrorCode.BlePeerRemovedPairingInformation);
    expect(second).toMatchObject({ code: HardwareErrorCode.PollingTimeout });
  });

  test('spends the sighting once, so the next attempt is short again', async () => {
    const { transport, connectOptions, scan } = createHarness();
    await scan();

    await acquire(transport);
    await acquire(transport);

    expect(connectOptions.map(options => options.timeout)).toEqual([
      IOS_PRESENT_DEVICE_CONNECT_TIMEOUT_MS,
      NATIVE_CONNECT_TIMEOUT_MS,
    ]);
  });

  test('ignores a sighting that is no longer fresh', async () => {
    const { transport, connectOptions, scan } = createHarness();
    await scan();
    jest.setSystemTime(Date.now() + IOS_PRESENT_DEVICE_WINDOW_MS + 1);

    await acquire(transport);

    expect(connectOptions[0]?.timeout).toBe(NATIVE_CONNECT_TIMEOUT_MS);
  });

  test('keeps the short budget for a firmware-install reconnect', async () => {
    const { transport, connectOptions, scan } = createHarness();
    await scan();

    await acquire(transport, { expectedProtocol: 'V2', skipProtocolProbe: true });

    expect(connectOptions[0]?.timeout).toBe(NATIVE_CONNECT_TIMEOUT_MS);
  });

  test('moves the JS backstop with the native budget and logs it', async () => {
    const { transport, scan, logger } = createHarness();
    await scan();

    await acquire(transport);

    expect(IOS_PRESENT_DEVICE_CONNECT_BACKSTOP_MS).toBeGreaterThan(
      IOS_PRESENT_DEVICE_CONNECT_TIMEOUT_MS
    );
    expect(BLE_CONNECT_TIMEOUT_MS).toBeGreaterThan(NATIVE_CONNECT_TIMEOUT_MS);
    expect(logger.debug).toHaveBeenCalledWith(
      '[ReactNativeBleTransport] connect completed',
      expect.objectContaining({
        succeeded: false,
        backstopExpired: false,
        backstopMs: IOS_PRESENT_DEVICE_CONNECT_BACKSTOP_MS,
      })
    );
  });
});
