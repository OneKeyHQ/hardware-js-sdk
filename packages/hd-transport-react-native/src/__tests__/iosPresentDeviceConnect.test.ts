import EventEmitter from 'events';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport, {
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
  const connectOptions: ConnectOptions[] = [];
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
    id: UUID,
    name: 'Neo 5284',
    localName: 'Neo 5284',
    serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
    isConnected: jest.fn(() => Promise.resolve(false)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    connect: jest.fn(connectToLostBond),
    discoverAllServicesAndCharacteristics: jest.fn(() => Promise.resolve()),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  };
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
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
  };
  const transport = new ReactNativeBleTransport({ scanTimeout: 1 });
  (transport as any).blePlxManager = bleManager;
  transport.init(
    { debug: jest.fn(), error: jest.fn(), warn: jest.fn() } as any,
    new EventEmitter()
  );
  transport.configure(protocolV1Schema);

  return { transport, connectOptions, device };
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
    const { transport, connectOptions } = createHarness();
    (transport as any).iosLastAdvertisedAt.set(UUID, Date.now());

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
    const { transport, connectOptions } = createHarness();
    (transport as any).iosLastAdvertisedAt.set(UUID, Date.now());

    await acquire(transport);
    await acquire(transport);

    expect(connectOptions.map(options => options.timeout)).toEqual([
      IOS_PRESENT_DEVICE_CONNECT_TIMEOUT_MS,
      NATIVE_CONNECT_TIMEOUT_MS,
    ]);
  });

  test('ignores a sighting that is no longer fresh', async () => {
    const { transport, connectOptions } = createHarness();
    (transport as any).iosLastAdvertisedAt.set(UUID, Date.now());
    jest.setSystemTime(Date.now() + IOS_PRESENT_DEVICE_WINDOW_MS + 1);

    await acquire(transport);

    expect(connectOptions[0]?.timeout).toBe(NATIVE_CONNECT_TIMEOUT_MS);
  });

  test('keeps the short budget for a firmware-install reconnect', async () => {
    const { transport, connectOptions } = createHarness();
    (transport as any).iosLastAdvertisedAt.set(UUID, Date.now());

    await acquire(transport, { expectedProtocol: 'V2', skipProtocolProbe: true });

    expect(connectOptions[0]?.timeout).toBe(NATIVE_CONNECT_TIMEOUT_MS);
  });

  test('reports a lost bond named by the first GATT operation', async () => {
    const { transport, device } = createHarness();
    device.connect.mockResolvedValueOnce(device);
    device.discoverAllServicesAndCharacteristics.mockRejectedValueOnce(
      Object.assign(new Error('Device was disconnected'), {
        errorCode: 201,
        iosErrorCode: 14,
        reason: 'Peer removed pairing information',
      })
    );

    await expect(acquire(transport)).resolves.toMatchObject({
      code: HardwareErrorCode.BlePeerRemovedPairingInformation,
    });
  });
});
