import transport from '@onekeyfe/hd-transport';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import WebUsbTransport from '../src/webusb';

const schema = {
  nested: {
    Ping: { fields: { message: { type: 'string', id: 1 } } },
    Success: { fields: { message: { type: 'string', id: 1 } } },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
      },
    },
  },
};

function buildAcquirableTransport(path = 'pro-webusb') {
  const webusb = new WebUsbTransport() as any;
  webusb.Log = { debug: jest.fn() };
  webusb.rotateProtocolV2UsbGeneration = jest.fn().mockResolvedValue(undefined);
  webusb.closeOpenDevice = jest.fn().mockResolvedValue(undefined);
  webusb.connect = jest.fn().mockResolvedValue(undefined);
  // Simulate a device that stayed connected since the probe: same USBDevice
  // object present in the device list and recorded as the probed object.
  const deviceObject = { serialNumber: path } as unknown as USBDevice;
  webusb.deviceList = [{ path, device: deviceObject, commType: 'webusb' }];
  webusb.probedDeviceObjects.set(path, deviceObject);
  return webusb;
}

describe('WebUsbTransport protocol probe cache', () => {
  test('acquire skips the wire probe when the protocol is already cached', async () => {
    const webusb = buildAcquirableTransport();
    const path = 'pro-webusb';
    webusb.deviceProtocol.set(path, 'V1');
    webusb.detectProtocol = jest.fn();

    await expect(webusb.acquire({ path, expectedProtocol: 'V1' })).resolves.toBe(path);

    expect(webusb.detectProtocol).not.toHaveBeenCalled();
    expect(webusb.deviceProtocol.get(path)).toBe('V1');
    expect(webusb.acquiredPaths.has(path)).toBe(true);
  });

  test('acquire re-probes when the caller expects a different protocol than cached', async () => {
    const webusb = buildAcquirableTransport();
    const path = 'pro-webusb';
    webusb.deviceProtocol.set(path, 'V1');
    webusb.detectProtocol = jest.fn().mockImplementation((p: string) => {
      webusb.deviceProtocol.set(p, 'V2');
      return Promise.resolve('V2');
    });

    await expect(webusb.acquire({ path, expectedProtocol: 'V2' })).resolves.toBe(path);

    expect(webusb.detectProtocol).toHaveBeenCalledWith(path, 'V2', undefined);
    expect(webusb.deviceProtocol.get(path)).toBe('V2');
  });

  test('acquire probes when nothing is cached for the path', async () => {
    const webusb = buildAcquirableTransport();
    const path = 'pro-webusb';
    webusb.detectProtocol = jest.fn().mockResolvedValue('V1');

    await expect(webusb.acquire({ path, expectedProtocol: 'V1' })).resolves.toBe(path);

    expect(webusb.detectProtocol).toHaveBeenCalledWith(path, 'V1', undefined);
  });

  test('acquire re-probes when the USBDevice object identity changed since the probe', async () => {
    const webusb = buildAcquirableTransport();
    const path = 'pro-webusb';
    webusb.deviceProtocol.set(path, 'V1');
    // Simulate a replug the transport never saw a disconnect event for: the OS
    // re-enumerated the device, so the list now holds a NEW USBDevice object.
    webusb.deviceList = [
      { path, device: { serialNumber: path } as unknown as USBDevice, commType: 'webusb' },
    ];
    webusb.detectProtocol = jest.fn().mockImplementation((p: string) => {
      webusb.deviceProtocol.set(p, 'V1');
      return Promise.resolve('V1');
    });

    await expect(webusb.acquire({ path, expectedProtocol: 'V1' })).resolves.toBe(path);

    expect(webusb.detectProtocol).toHaveBeenCalledTimes(1);
  });

  test('acquire re-probes a stale-marked path even when a protocol is cached', async () => {
    const webusb = buildAcquirableTransport();
    const path = 'pro-webusb';
    webusb.deviceProtocol.set(path, 'V1');
    webusb.markProtocolStale(path);
    webusb.detectProtocol = jest.fn().mockImplementation((p: string) => {
      webusb.deviceProtocol.set(p, 'V1');
      return Promise.resolve('V1');
    });

    await expect(webusb.acquire({ path, expectedProtocol: 'V1' })).resolves.toBe(path);

    expect(webusb.detectProtocol).toHaveBeenCalledTimes(1);
    expect(webusb.staleProtocolPaths.has(path)).toBe(false);
  });

  test('release keeps the cached V1 protocol so the next acquire can reuse it', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro-webusb';
    webusb.deviceProtocol.set(path, 'V1');
    webusb.deviceProtocolHints.set(path, 'V2');
    webusb.deviceEndpoints.set(path, { interfaceNumber: 0, endpointIn: 1, endpointOut: 1 });
    webusb.acquiredPaths.add(path);
    webusb.closeOpenDevice = jest.fn().mockResolvedValue(undefined);

    await webusb.release(path);

    expect(webusb.deviceProtocol.get(path)).toBe('V1');
    expect(webusb.deviceProtocolHints.get(path)).toBe('V2');
    expect(webusb.deviceEndpoints.has(path)).toBe(false);
    expect(webusb.acquiredPaths.has(path)).toBe(false);
  });

  test('release still drops a cached V2 protocol through link invalidation', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro2-webusb';
    webusb.Log = { debug: jest.fn() };
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    webusb.writeProtocolV2UsbPacket = jest.fn().mockResolvedValue(undefined);
    let markReadStarted: () => void = () => undefined;
    const readStarted = new Promise<void>(resolve => {
      markReadStarted = resolve;
    });
    webusb.readProtocolV2UsbPacket = jest.fn().mockImplementation(() => {
      markReadStarted();
      return new Promise<void>(() => {});
    });
    webusb.closeOpenDevice = jest.fn().mockResolvedValue(undefined);
    webusb.deviceProtocol.set(path, 'V2');
    await webusb.rotateProtocolV2UsbGeneration(path, 'test connection');

    const call = webusb.callProtocolV2(path, 'Ping', { message: 'release' });
    await readStarted;
    await webusb.release(path);

    await expect(call).rejects.toThrow('WebUSB transport released');
    expect(webusb.deviceProtocol.has(path)).toBe(false);
  });

  test('call and post fail fast for a path that is not acquired', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro-webusb';
    webusb.Log = { debug: jest.fn() };
    webusb.messages = transport.parseConfigure(schema);
    webusb.messagesV2 = transport.parseConfigure(schema);
    // A surviving protocol cache entry must NOT act as a session token.
    webusb.deviceProtocol.set(path, 'V1');

    await expect(webusb.call(path, 'Ping', {})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: expect.stringContaining('not acquired'),
    });
    await expect(webusb.post(path, 'Ping', {})).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: expect.stringContaining('not acquired'),
    });
  });

  test('a transfer-level reconnect marks the protocol stale for the next acquire', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'pro-webusb';
    webusb.Log = { debug: jest.fn() };
    webusb.deviceProtocol.set(path, 'V1');
    webusb.findDevice = jest.fn().mockResolvedValue({ opened: false });
    webusb.getConnectedDevices = jest.fn().mockResolvedValue([]);
    webusb.connect = jest.fn().mockResolvedValue(undefined);

    await webusb.reconnectForPacketIoRetry(path, 'in', 0, new Error('transferIn failed'));

    // The in-flight call keeps the cached protocol; only the next acquire re-probes.
    expect(webusb.deviceProtocol.get(path)).toBe('V1');
    expect(webusb.staleProtocolPaths.has(path)).toBe(true);
  });

  test('USB disconnect marks the serial stale and the listener attaches only once', () => {
    const addEventListener = jest.fn();
    const usb = { addEventListener } as unknown as USB;
    const originalNavigator = (globalThis as any).navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { usb },
      configurable: true,
    });
    try {
      const first = new WebUsbTransport() as any;
      first.init({ debug: jest.fn() });
      const second = new WebUsbTransport() as any;
      second.init({ debug: jest.fn() });

      // Module-level listener: one registration across instances.
      expect(addEventListener).toHaveBeenCalledTimes(1);
      const handler = addEventListener.mock.calls[0][1] as (event: {
        device?: { serialNumber?: string | null };
      }) => void;

      const path = 'pro-webusb';
      first.deviceProtocol.set(path, 'V1');
      second.deviceProtocol.set(path, 'V1');
      handler({ device: { serialNumber: path } });

      // Routed to the most recently initialized instance; the cached value is
      // retained (in-flight sessions keep working) but marked stale.
      expect(second.staleProtocolPaths.has(path)).toBe(true);
      expect(second.deviceProtocol.get(path)).toBe('V1');
      expect(first.staleProtocolPaths.has(path)).toBe(false);

      // Events without a usable serial are ignored.
      handler({ device: { serialNumber: null } });
      handler({});
      expect(second.staleProtocolPaths.size).toBe(1);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });
});
