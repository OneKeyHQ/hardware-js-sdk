import ReactNativeBleTransport, { PROTOCOL_REPROBE_FALLBACK_ATTEMPTS } from '../index';
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

const UUID = 'reprobe-device';

/** Drive detectProtocol with stubbed probes so we can observe which are attempted. */
function createHarness({ v1, v2 }: { v1: boolean; v2: boolean }) {
  const transport = new ReactNativeBleTransport({});
  transport.configure(protocolV1Schema);
  const probeV1 = jest.fn(() => {
    if (v1) {
      (transport as any).deviceProtocol.set(UUID, 'V1');
    }
    return Promise.resolve(v1);
  });
  const probeV2 = jest.fn(() => {
    if (v2) {
      (transport as any).deviceProtocol.set(UUID, 'V2');
    }
    return Promise.resolve(v2);
  });
  (transport as any).probeProtocolV1 = probeV1;
  (transport as any).probeProtocolV2 = probeV2;
  (transport as any).resetProbeStateAfterProtocolProbe = jest.fn(() => Promise.resolve());
  return { transport, probeV1, probeV2 };
}

const detect = (transport: ReactNativeBleTransport) =>
  (transport as any).detectProtocol(UUID, undefined, undefined, () =>
    Promise.resolve()
  ) as Promise<string>;

describe('iOS expected-protocol detection', () => {
  test('still probes an expected Protocol V2 so USB-priority can surface', async () => {
    const { transport, probeV1, probeV2 } = createHarness({ v1: false, v2: true });

    await expect(
      (transport as any).detectProtocol(UUID, 'V2', undefined, () => Promise.resolve())
    ).resolves.toBe('V2');

    expect(probeV2).toHaveBeenCalledTimes(1);
    expect(probeV1).not.toHaveBeenCalled();
  });

  test('keeps the existing iOS shortcut for an expected Protocol V1', async () => {
    const { transport, probeV1, probeV2 } = createHarness({ v1: false, v2: false });

    await expect(
      (transport as any).detectProtocol(UUID, 'V1', undefined, () => Promise.resolve())
    ).resolves.toBe('V1');

    expect(probeV1).not.toHaveBeenCalled();
    expect(probeV2).not.toHaveBeenCalled();
  });
});

describe('protocol re-probe after a known device goes away', () => {
  test('an unknown device still probes both protocols', async () => {
    const { transport, probeV1, probeV2 } = createHarness({ v1: false, v2: false });

    await expect(detect(transport)).rejects.toBeDefined();

    expect(probeV1).toHaveBeenCalledTimes(1);
    expect(probeV2).toHaveBeenCalledTimes(1);
  });

  test('a device already known to speak V1 does not pay the V2 probe while it is away', async () => {
    const known = createHarness({ v1: true, v2: false });
    // First detection confirms V1 (this is the session that just talked to the device).
    await expect(detect(known.transport)).resolves.toBe('V1');

    // The device now reboots after a firmware install: V1 stops answering.
    (known.transport as any).deviceProtocol.delete(UUID);
    const probeV1 = jest.fn(() => Promise.resolve(false));
    const probeV2 = jest.fn(() => Promise.resolve(false));
    (known.transport as any).probeProtocolV1 = probeV1;
    (known.transport as any).probeProtocolV2 = probeV2;

    await expect(detect(known.transport)).rejects.toBeDefined();

    expect(probeV1).toHaveBeenCalledTimes(1);
    // The 10s Protocol V2 ping is pure waste for a device we just spoke V1 to.
    expect(probeV2).not.toHaveBeenCalled();
  });

  test('after repeated failures it re-probes every protocol again', async () => {
    const known = createHarness({ v1: true, v2: false });
    await expect(detect(known.transport)).resolves.toBe('V1');

    (known.transport as any).deviceProtocol.delete(UUID);
    const probeV1 = jest.fn(() => Promise.resolve(false));
    const probeV2 = jest.fn(() => Promise.resolve(false));
    (known.transport as any).probeProtocolV1 = probeV1;
    (known.transport as any).probeProtocolV2 = probeV2;

    for (let attempt = 0; attempt < PROTOCOL_REPROBE_FALLBACK_ATTEMPTS; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await expect(detect(known.transport)).rejects.toBeDefined();
    }
    expect(probeV2).not.toHaveBeenCalled();

    // The device may genuinely have changed protocol, so the shortcut must expire.
    await expect(detect(known.transport)).rejects.toBeDefined();
    expect(probeV2).toHaveBeenCalled();
  });

  test('a successful detection clears the failure streak', async () => {
    const known = createHarness({ v1: true, v2: false });
    await expect(detect(known.transport)).resolves.toBe('V1');
    (known.transport as any).deviceProtocol.delete(UUID);

    const failingV1 = jest.fn(() => Promise.resolve(false));
    (known.transport as any).probeProtocolV1 = failingV1;
    await expect(detect(known.transport)).rejects.toBeDefined();

    // Device comes back.
    (known.transport as any).probeProtocolV1 = jest.fn(() => {
      (known.transport as any).deviceProtocol.set(UUID, 'V1');
      return Promise.resolve(true);
    });
    await expect(detect(known.transport)).resolves.toBe('V1');

    expect((known.transport as any).protocolReprobeFailures.get(UUID)).toBeUndefined();
  });
});
