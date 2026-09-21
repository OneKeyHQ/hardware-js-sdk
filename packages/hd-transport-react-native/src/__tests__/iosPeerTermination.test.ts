import EventEmitter from 'events';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import ReactNativeBleTransport from '../index';
import {
  IOS_PEER_TERMINATION_LINK_WINDOW_MS,
  IOS_PEER_TERMINATION_REPEAT_WINDOW_MS,
  IosPeerTerminationTracker,
} from '../bleIosStaleBond';
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

const UUID = '2146E74A-21CC-2EA6-2CE3-B4258520FD0F';

// What ble-plx rejects the in-flight operation with when the device ends the link. An iPhone 17
// reports a wiped device this way instead of CBErrorPeerRemovedPairingInformation.
const nativeDisconnect = (iosErrorCode: number, reason: string) =>
  Object.assign(new Error(`Device ${UUID} was disconnected`), {
    errorCode: 201,
    iosErrorCode,
    reason,
  });
const peerEndedLink = () => nativeDisconnect(7, 'The specified device has disconnected from us.');
const linkTimedOut = () => nativeDisconnect(6, 'The connection has timed out unexpectedly.');

function createHarness() {
  const writeCharacteristic = {
    uuid: '00000002-0000-1000-8000-00805f9b34fb',
    isWritableWithResponse: true,
    writeWithResponse: jest.fn(() => Promise.resolve()),
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
    isConnected: jest.fn(() => Promise.resolve(false)),
    cancelConnection: jest.fn(() => Promise.resolve()),
    connect: jest.fn(),
    discoverAllServicesAndCharacteristics: jest.fn(() => Promise.resolve()),
    characteristicsForService: jest.fn(() =>
      Promise.resolve([writeCharacteristic, notifyCharacteristic])
    ),
    services: jest.fn(() => Promise.resolve([])),
    onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
  };
  device.connect.mockImplementation(() => Promise.resolve(device));
  const transport = new ReactNativeBleTransport({});
  (transport as any).blePlxManager = {
    devices: jest.fn(() => Promise.resolve([device])),
    connectedDevices: jest.fn(() => Promise.resolve([])),
    connectToDevice: jest.fn(() => Promise.resolve(device)),
    cancelTransaction: jest.fn(() => Promise.resolve()),
    cancelDeviceConnection: jest.fn(() => Promise.resolve()),
    onStateChange: jest.fn((listener: (state: string) => void) => {
      setImmediate(() => listener('PoweredOn'));
      return { remove: jest.fn() };
    }),
    state: jest.fn(() => Promise.resolve('PoweredOn')),
  };
  const logger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn() };
  transport.init(logger as any, new EventEmitter());
  transport.configure(protocolV1Schema);
  return { transport, device, writeCharacteristic, notifyCharacteristic, logger };
}

type Outcome = { code?: unknown; params?: unknown; native?: unknown };

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

/** Runs one acquire to its end, moving the fake clock past the transport's own waits. */
async function acquire(
  transport: ReactNativeBleTransport,
  input: Record<string, unknown> = {}
): Promise<Outcome> {
  let outcome: Outcome | undefined;
  transport.acquire({ uuid: UUID, ...input } as never).then(
    () => {
      outcome = {};
    },
    error => {
      const { code, params } = ERRORS.serializeError({ error });
      outcome = { code, params, native: (error as { iosErrorCode?: unknown }).iosErrorCode };
    }
  );
  for (let i = 0; i < 400 && !outcome; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await flush();
    if (!outcome) jest.advanceTimersByTime(100);
  }
  if (!outcome) throw new Error('acquire did not settle');
  return outcome;
}

describe('iOS link ended by the device right after connecting', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance', 'nextTick'] });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('keeps the first error so Core retries, then reports an invalid bond', async () => {
    const { transport, device } = createHarness();
    device.discoverAllServicesAndCharacteristics.mockImplementation(() =>
      Promise.reject(peerEndedLink())
    );

    // Core retries an error it cannot classify, which is what makes the second attempt.
    await expect(acquire(transport)).resolves.toEqual({ native: 7 });
    await expect(acquire(transport)).resolves.toEqual({
      code: HardwareErrorCode.BleBondInvalid,
      params: { phase: 'connect', reason: 'peer_disconnected' },
    });
    // The verdict consumes the evidence, so the next one needs two attempts again.
    await expect(acquire(transport)).resolves.toEqual({ native: 7 });
  });

  test('counts a drop that interrupts the first write the same way', async () => {
    const { transport, writeCharacteristic } = createHarness();
    writeCharacteristic.writeWithResponse.mockImplementation(() => Promise.reject(peerEndedLink()));

    await expect(acquire(transport)).resolves.toMatchObject({
      code: HardwareErrorCode.BleDeviceNotBonded,
    });
    await expect(acquire(transport)).resolves.toMatchObject({
      code: HardwareErrorCode.BleBondInvalid,
    });
  });

  test('counts a drop that only the notification stream reports', async () => {
    const { transport, notifyCharacteristic } = createHarness();
    // The request went out before the link ended, so no write is there to fail.
    notifyCharacteristic.monitor.mockImplementation(((
      listener: (error: unknown, characteristic: unknown) => void
    ) => {
      setTimeout(() => listener(peerEndedLink(), null), 50);
      return { remove: jest.fn() };
    }) as never);

    await expect(acquire(transport)).resolves.not.toMatchObject({
      code: HardwareErrorCode.BleBondInvalid,
    });
    await expect(acquire(transport)).resolves.toMatchObject({
      code: HardwareErrorCode.BleBondInvalid,
    });
  });

  test('needs the second drop soon after the first', async () => {
    const { transport, device } = createHarness();
    device.discoverAllServicesAndCharacteristics.mockImplementation(() =>
      Promise.reject(peerEndedLink())
    );

    await acquire(transport);
    jest.setSystemTime(Date.now() + IOS_PEER_TERMINATION_REPEAT_WINDOW_MS + 1);

    await expect(acquire(transport)).resolves.toEqual({ native: 7 });
  });

  test('starts over after an attempt that failed for another reason', async () => {
    const { transport, device } = createHarness();
    device.discoverAllServicesAndCharacteristics
      .mockImplementationOnce(() => Promise.reject(peerEndedLink()))
      .mockImplementationOnce(() => Promise.reject(linkTimedOut()))
      .mockImplementation(() => Promise.reject(peerEndedLink()));

    await acquire(transport);
    await expect(acquire(transport)).resolves.toEqual({ native: 6 });
    await expect(acquire(transport)).resolves.toEqual({ native: 7 });
  });

  test('starts over once the device has answered', async () => {
    const { transport, device } = createHarness();
    (transport as any).detectProtocol = jest.fn(() => Promise.resolve('V1'));
    device.discoverAllServicesAndCharacteristics
      .mockImplementationOnce(() => Promise.reject(peerEndedLink()))
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementation(() => Promise.reject(peerEndedLink()));

    await acquire(transport);
    await expect(acquire(transport)).resolves.toEqual({});

    await expect(acquire(transport)).resolves.toEqual({ native: 7 });
  });

  test('never classifies a firmware-install reconnect', async () => {
    const { transport, device } = createHarness();
    device.discoverAllServicesAndCharacteristics.mockImplementation(() =>
      Promise.reject(peerEndedLink())
    );
    const reconnect = { expectedProtocol: 'V2', skipProtocolProbe: true };

    await expect(acquire(transport, reconnect)).resolves.toEqual({ native: 7 });
    await expect(acquire(transport, reconnect)).resolves.toEqual({ native: 7 });
    // The device was rebooting, so those drops are not evidence for a later attempt either.
    await expect(acquire(transport)).resolves.toEqual({ native: 7 });
  });

  test('logs the native codes of the failed operation, which iOS reports nowhere else', async () => {
    const { transport, device, logger } = createHarness();
    device.discoverAllServicesAndCharacteristics.mockImplementation(() =>
      Promise.reject(peerEndedLink())
    );

    await acquire(transport);

    expect(logger.debug).toHaveBeenCalledWith('[ReactNativeBleTransport] iOS operation failed', {
      connectIdSuffix: UUID.slice(-8),
      stage: 'gatt-setup',
      errorCode: 201,
      iosErrorCode: 7,
      attErrorCode: undefined,
    });
  });

  test('reports a lost bond that iOS names during GATT setup', async () => {
    const { transport, device } = createHarness();
    device.discoverAllServicesAndCharacteristics.mockImplementation(() =>
      Promise.reject(nativeDisconnect(14, 'Peer removed pairing information'))
    );

    await expect(acquire(transport)).resolves.toMatchObject({
      code: HardwareErrorCode.BlePeerRemovedPairingInformation,
    });
  });
});

describe('IosPeerTerminationTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const dropLink = (tracker: IosPeerTerminationTracker, linkAgeMs = 0) => {
    tracker.attemptStarted(UUID);
    tracker.linkStarted(UUID);
    jest.setSystemTime(Date.now() + linkAgeMs);
    tracker.note(UUID, peerEndedLink());
    return tracker.attemptFailed(UUID);
  };

  test('ignores a drop on a link that was reused or had been up for a while', () => {
    const tracker = new IosPeerTerminationTracker();
    expect(dropLink(tracker)).toBe(false);

    tracker.attemptStarted(UUID);
    tracker.note(UUID, peerEndedLink());
    expect(tracker.attemptFailed(UUID)).toBe(false);

    expect(dropLink(tracker)).toBe(false);
    expect(dropLink(tracker, IOS_PEER_TERMINATION_LINK_WINDOW_MS + 1)).toBe(false);
  });

  test('ignores errors that do not say the peer ended the link', () => {
    const tracker = new IosPeerTerminationTracker();
    expect(dropLink(tracker)).toBe(false);

    tracker.attemptStarted(UUID);
    tracker.linkStarted(UUID);
    tracker.note(UUID, linkTimedOut());
    tracker.note(UUID, { errorCode: 201 });
    tracker.note(UUID, undefined);
    expect(tracker.attemptFailed(UUID)).toBe(false);
  });
});
