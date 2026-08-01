import { Buffer } from 'buffer';
import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { TrezorWebUsbConnector } from '../TrezorWebUsbConnector';
import {
  TREZOR_USB_PACKET_SIZE,
  TREZOR_WEBUSB_BOOTLOADER_PRODUCT,
  TREZOR_WEBUSB_FIRMWARE_PRODUCT,
  TREZOR_WEBUSB_VENDOR_ID,
} from '../constants';
import { TrezorWebUsbTransport } from '../TrezorWebUsbTransport';

type Listener = (event: { device: USBDevice }) => void;

/** Minimal USBDevice mock that the transport can drive. */
class FakeUSBDevice {
  opened = false;

  configuration = {
    configurationValue: 1,
    interfaces: [{ interfaceNumber: 0, claimed: false }],
  } as USBDevice['configuration'];

  readonly serialNumber: string;

  readonly vendorId: number;

  readonly productId: number;

  readonly productName: string;

  readonly transfersOut: Buffer[] = [];

  readonly queuedReads: Buffer[] = [];

  readonly reset = jest.fn<Promise<void>, []>(async () => undefined);

  constructor(
    opts: {
      serialNumber?: string;
      vendorId?: number;
      productId?: number;
      productName?: string;
    } = {}
  ) {
    this.serialNumber = opts.serialNumber ?? 'TREZOR-SERIAL-AA';
    this.vendorId = opts.vendorId ?? TREZOR_WEBUSB_VENDOR_ID;
    this.productId = opts.productId ?? TREZOR_WEBUSB_FIRMWARE_PRODUCT;
    this.productName = opts.productName ?? 'Trezor Safe 5';
  }

  open = jest.fn(async () => {
    this.opened = true;
  });

  close = jest.fn(async () => {
    this.opened = false;
  });

  selectConfiguration = jest.fn(async (configurationValue: number) => {
    this.configuration = {
      configurationValue,
      interfaces: [{ interfaceNumber: 0, claimed: false }],
    } as USBDevice['configuration'];
  });

  claimInterface = jest.fn(async (interfaceNumber: number) => {
    const iface = this.configuration?.interfaces.find(
      item => item.interfaceNumber === interfaceNumber
    );
    if (iface) {
      (iface as { claimed: boolean }).claimed = true;
    }
  });

  releaseInterface = jest.fn(async (interfaceNumber: number) => {
    const iface = this.configuration?.interfaces.find(
      item => item.interfaceNumber === interfaceNumber
    );
    if (iface) {
      (iface as { claimed: boolean }).claimed = false;
    }
  });

  transferOut = jest.fn<Promise<USBOutTransferResult>, [number, BufferSource]>(
    async (_endpoint, data) => {
      this.transfersOut.push(Buffer.from(data as ArrayBuffer));
      return { status: 'ok' as const, bytesWritten: (data as ArrayBuffer).byteLength };
    }
  );

  transferIn = jest.fn(async () => {
    const next = this.queuedReads.shift();
    if (!next) {
      return { status: 'stall' as const, data: undefined };
    }
    return {
      status: 'ok' as const,
      data: new DataView(next.buffer.slice(next.byteOffset, next.byteOffset + next.byteLength)),
    };
  });
}

class FakeUSB {
  private readonly devices: FakeUSBDevice[];

  private readonly disconnectListeners = new Set<Listener>();

  constructor(devices: FakeUSBDevice[] = []) {
    this.devices = devices;
  }

  getDevices = jest.fn(async () => this.devices as unknown as USBDevice[]);

  requestDevice = jest.fn(
    async ({ filters: _filters }: { filters: USBDeviceFilter[] }) =>
      this.devices[0] as unknown as USBDevice
  );

  addEventListener = jest.fn((event: string, listener: Listener) => {
    if (event === 'disconnect') this.disconnectListeners.add(listener);
  });

  removeEventListener = jest.fn((event: string, listener: Listener) => {
    if (event === 'disconnect') this.disconnectListeners.delete(listener);
  });

  fireDisconnect(device: FakeUSBDevice): void {
    for (const listener of this.disconnectListeners) {
      listener({ device: device as unknown as USBDevice });
    }
  }
}

describe('TrezorWebUsbConnector', () => {
  test('enumerateDevices maps Trezor descriptors to ConnectorDevice (uses serialNumber as connectId)', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'SAFE5-AAA' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    const devices = await connector.searchDevices();

    expect(devices).toEqual([
      expect.objectContaining({
        connectId: 'SAFE5-AAA',
        deviceId: 'SAFE5-AAA',
        name: 'Trezor Safe 5',
        model: 'unknown',
        capabilities: { persistentDeviceIdentity: true },
      }),
    ]);
  });

  test('enumerateDevices filters out non-Trezor USB devices', async () => {
    const trezor = new FakeUSBDevice({ serialNumber: 'TZ1' });
    const yubikey = new FakeUSBDevice({
      serialNumber: 'YK1',
      vendorId: 0x1050,
      productId: 0x0407,
      productName: 'YubiKey',
    });
    const usb = new FakeUSB([trezor, yubikey]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    const devices = await connector.searchDevices();
    expect(devices.map(d => d.connectId)).toEqual(['TZ1']);
  });

  test('enumerateDevices filters out OneKey devices that share Trezor WebUSB VID/PID', async () => {
    const trezor = new FakeUSBDevice({
      serialNumber: 'TZ1',
      productName: 'Trezor Safe 5',
    });
    const onekey = new FakeUSBDevice({
      serialNumber: 'OK1',
      productName: 'OneKey Pro',
    });
    Object.defineProperty(onekey, 'manufacturerName', {
      value: 'OneKey',
      configurable: true,
    });
    const usb = new FakeUSB([trezor, onekey]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    const devices = await connector.searchDevices();
    expect(devices.map(d => d.connectId)).toEqual(['TZ1']);
  });

  test('logs filtered descriptors only when WebUSB scan drops devices', async () => {
    const trezor = new FakeUSBDevice({
      serialNumber: 'TZ1',
      productName: 'Trezor Safe 5',
    });
    const onekey = new FakeUSBDevice({
      serialNumber: 'OK1',
      productName: 'OneKey Pro',
    });
    Object.defineProperty(onekey, 'manufacturerName', {
      value: 'OneKey',
      configurable: true,
    });
    const usb = new FakeUSB([trezor, onekey]);
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const logger = (entry: { event: string; data?: Record<string, unknown> }) =>
      logs.push({ event: entry.event, data: entry.data });
    const transport = new TrezorWebUsbTransport({
      usb: usb as unknown as USB,
      logger,
    });
    const connector = new TrezorWebUsbConnector({
      transport,
      transportOptions: {
        logger,
      },
    });

    const devices = await connector.searchDevices();

    expect(devices.map(d => d.connectId)).toEqual(['TZ1']);
    expect(logs).toContainEqual({
      event: 'webusb.connector.enumerate.filtered',
      data: expect.objectContaining({
        transport: 'webusb',
        descriptorCount: 2,
        filteredCount: 1,
        dropped: [
          expect.objectContaining({
            connectId: 'OK1',
            productName: 'OneKey Pro',
            manufacturerName: 'OneKey',
            matchesTrezorUsbFilter: false,
          }),
        ],
        kept: [
          expect.objectContaining({
            connectId: 'TZ1',
            matchesTrezorUsbFilter: true,
          }),
        ],
      }),
    });
  });

  test('does not log WebUSB scan details when no devices are filtered', async () => {
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const logger = (entry: { event: string; data?: Record<string, unknown> }) =>
      logs.push({ event: entry.event, data: entry.data });
    const usb = new FakeUSB([]);
    const transport = new TrezorWebUsbTransport({
      usb: usb as unknown as USB,
      logger,
    });
    const connector = new TrezorWebUsbConnector({
      transport,
      transportOptions: {
        logger,
      },
    });

    await expect(connector.searchDevices()).resolves.toEqual([]);

    expect(logs.some(log => log.event === 'webusb.scan.filtered')).toBe(false);
    expect(logs.some(log => log.event === 'webusb.connector.enumerate.filtered')).toBe(false);
  });

  test('bootloader devices are labeled and not flagged as persistent-identity', async () => {
    const boot = new FakeUSBDevice({
      productId: TREZOR_WEBUSB_BOOTLOADER_PRODUCT,
      productName: 'Trezor Bootloader',
      serialNumber: '',
    });
    const usb = new FakeUSB([boot]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    const devices = await connector.searchDevices();
    expect(devices[0].name).toBe('Trezor (bootloader)');
    expect(devices[0].connectId).toMatch(/^trezor-webusb-1209-53c0-/);
    expect(devices[0].capabilities?.persistentDeviceIdentity).toBe(false);
  });

  test('connect does not treat an arbitrary firmware device_id as a WebUSB descriptor', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'A37803C61D8DCB1542D7AEE7' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    await expect(connector.connect('CDFA468E8B72A66B33873F5E')).rejects.toThrow(
      'Trezor device not found: CDFA468E8B72A66B33873F5E'
    );
    expect(device.open).not.toHaveBeenCalled();
  });

  test('connect opens device, selects config 1, claims interface 0', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'OPEN-ME' });
    device.opened = false;
    device.configuration = { configurationValue: 0 } as USBDevice['configuration'];
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });

    await transport.connect('OPEN-ME');

    expect(device.open).toHaveBeenCalledTimes(1);
    expect(device.selectConfiguration).toHaveBeenCalledWith(1);
    expect(device.claimInterface).toHaveBeenCalledWith(0);
  });

  test('connect reports WebUSB claimInterface failure as standard TransportError', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'CLAIM-FAIL' });
    device.claimInterface.mockRejectedValueOnce(new Error('claim failed'));
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });

    await expect(transport.connect('CLAIM-FAIL')).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'claim failed',
    });
  });

  test('connect reuses an already-open USB handle without resetting', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'STALE-HANDLE' });
    device.opened = true;
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });

    await transport.connect('STALE-HANDLE');

    expect(device.open).not.toHaveBeenCalled();
    // No device.reset() — on WebUSB it re-enumerates and wedges a THP device.
    expect(device.reset).not.toHaveBeenCalled();
    expect(device.claimInterface).toHaveBeenCalledWith(0);
  });

  test('write pads short chunks to 64-byte frames', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'WRITE-ME' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('WRITE-ME');

    await transport.write('WRITE-ME', new Uint8Array([0x3f, 0x23, 0x23, 0xaa, 0xbb]));

    expect(device.transferOut).toHaveBeenCalledTimes(1);
    expect(device.transfersOut[0].length).toBe(TREZOR_USB_PACKET_SIZE);
    expect(
      device.transfersOut[0].slice(0, 5).equals(Buffer.from([0x3f, 0x23, 0x23, 0xaa, 0xbb]))
    ).toBe(true);
    // Tail is zero-padded
    expect(device.transfersOut[0][63]).toBe(0);
  });

  test('write splits 130-byte payload into 3 frames (64 + 64 + 2 padded to 64)', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'BIG-WRITE' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('BIG-WRITE');

    const payload = new Uint8Array(130);
    for (let i = 0; i < 130; i++) payload[i] = i & 0xff;
    await transport.write('BIG-WRITE', payload);

    expect(device.transferOut).toHaveBeenCalledTimes(3);
    expect(device.transfersOut[0].length).toBe(64);
    expect(device.transfersOut[1].length).toBe(64);
    expect(device.transfersOut[2].length).toBe(64);
    expect(device.transfersOut[0][0]).toBe(0);
    expect(device.transfersOut[1][0]).toBe(64);
    expect(device.transfersOut[2][0]).toBe(128); // 0x80
    expect(device.transfersOut[2][1]).toBe(129); // 0x81
    expect(device.transfersOut[2][2]).toBe(0); // padded
  });

  test('write reports non-ok WebUSB transferOut as standard TransportError', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'WRITE-STALL' });
    device.transferOut.mockResolvedValueOnce({
      status: 'stall' as USBOutTransferResult['status'],
      bytesWritten: 0,
    });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('WRITE-STALL');

    await expect(transport.write('WRITE-STALL', new Uint8Array([0x3f]))).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'Trezor WebUSB transferOut failed: stall',
    });
  });

  test('write reports rejected WebUSB transferOut as standard TransportError', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'WRITE-REJECT' });
    device.transferOut.mockRejectedValueOnce(new Error('The device was disconnected.'));
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('WRITE-REJECT');

    await expect(transport.write('WRITE-REJECT', new Uint8Array([0x3f]))).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'The device was disconnected.',
    });
  });

  test('read returns one 64-byte frame from transferIn', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'READ-ME' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('READ-ME');

    const frame = Buffer.alloc(TREZOR_USB_PACKET_SIZE, 0xab);
    device.queuedReads.push(frame);

    const result = await transport.read('READ-ME');
    expect(result.length).toBe(TREZOR_USB_PACKET_SIZE);
    expect(result[0]).toBe(0xab);
  });

  test('read reports non-ok WebUSB transferIn as standard TransportError', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'READ-STALL' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('READ-STALL');

    await expect(transport.read('READ-STALL')).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'Trezor WebUSB transferIn failed: stall',
    });
  });

  test('read reports missing WebUSB data as standard TransportError', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'READ-NO-DATA' });
    device.transferIn.mockResolvedValueOnce({
      status: 'ok' as USBInTransferResult['status'],
      data: undefined,
    });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('READ-NO-DATA');

    await expect(transport.read('READ-NO-DATA')).rejects.toMatchObject({
      code: HardwareErrorCode.TransportError,
      message: 'Trezor WebUSB transferIn returned no data',
    });
  });

  test('write rejects on abort without resetting the device', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'ABORT-WAIT' });
    device.transferOut.mockImplementation(
      async () => new Promise<USBOutTransferResult>(() => undefined)
    );
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('ABORT-WAIT');

    const abortController = new AbortController();
    const pending = transport.write('ABORT-WAIT', new Uint8Array([0x3f]), abortController.signal);
    abortController.abort(new Error('stop'));

    // Abort rejects immediately; no device.reset() (it wedges a THP device).
    await expect(pending).rejects.toThrow('stop');
    expect(device.reset).not.toHaveBeenCalled();
  });

  test('disconnect releases interface and closes device without resetting', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'BYE' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('BYE');

    await transport.disconnect('BYE');
    expect(device.reset).not.toHaveBeenCalled();
    expect(device.releaseInterface).toHaveBeenCalledWith(0);
    expect(device.close).toHaveBeenCalledTimes(1);
  });

  test('onDisconnect handler fires on physical unplug', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'YANK' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    await transport.connect('YANK');

    const fired = jest.fn();
    transport.onDisconnect('YANK', fired);

    usb.fireDisconnect(device);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  test('requestDevice asks navigator.usb with Trezor filters', async () => {
    const device = new FakeUSBDevice({ serialNumber: 'PICKED' });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    const picked = await connector.requestDevice();

    expect(usb.requestDevice).toHaveBeenCalledWith({
      filters: [
        { vendorId: TREZOR_WEBUSB_VENDOR_ID, productId: TREZOR_WEBUSB_FIRMWARE_PRODUCT },
        { vendorId: TREZOR_WEBUSB_VENDOR_ID, productId: TREZOR_WEBUSB_BOOTLOADER_PRODUCT },
      ],
    });
    expect(picked.connectId).toBe('PICKED');
  });

  test('requestDevice reports cancelled WebUSB picker as standard UserAborted', async () => {
    const usb = new FakeUSB([]);
    usb.requestDevice.mockRejectedValueOnce(
      Object.assign(new Error('No device selected'), { name: 'NotFoundError' })
    );
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    await expect(connector.requestDevice()).rejects.toMatchObject({
      code: HardwareErrorCode.UserAborted,
      message: 'No device selected',
    });
  });

  test('requestDevice rejects a known non-Trezor WebUSB selection as DeviceMismatch', async () => {
    const device = new FakeUSBDevice({
      serialNumber: 'ONEKEY-PICKED',
      productName: 'OneKey Pro',
    });
    Object.defineProperty(device, 'manufacturerName', {
      value: 'OneKey',
      configurable: true,
    });
    const usb = new FakeUSB([device]);
    const transport = new TrezorWebUsbTransport({ usb: usb as unknown as USB });
    const connector = new TrezorWebUsbConnector({ transport });

    await expect(connector.requestDevice()).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceMismatch,
      message: 'Selected device is not a supported Trezor device.',
    });
  });
});
