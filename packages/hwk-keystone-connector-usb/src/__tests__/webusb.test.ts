import {
  Actions,
  OFFSET_INS,
  OFFSET_LC,
  USBTimeout,
  encode,
  keystoneUSBProductId,
  keystoneUSBVendorId,
} from '@keystonehq/hw-transport-usb';
import { Status } from '@keystonehq/hw-transport-error';
import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { createKeystoneWebUsbConnector } from '../_subpath/webusb';

function syntheticUsb(mode: 'normal' | 'silent' | 'cleanup') {
  let resumeCleanup: () => void = () => undefined;
  const cleanup = new Promise<void>(resolve => {
    resumeCleanup = resolve;
  });
  let packets: Uint8Array[] = [];
  const device = {
    vendorId: keystoneUSBVendorId,
    productId: keystoneUSBProductId,
    productName: 'Synthetic Keystone',
    opened: false,
    configuration: {},
    open: jest.fn(() => {
      device.opened = true;
      return Promise.resolve();
    }),
    close: jest.fn(() => {
      device.opened = false;
      return Promise.resolve();
    }),
    reset: jest.fn().mockResolvedValue(undefined),
    claimInterface: jest.fn().mockResolvedValue(undefined),
    releaseInterface: jest.fn(() => (mode === 'cleanup' ? cleanup : Promise.resolve())),
    transferOut: jest.fn((_endpoint: number, bytes: Uint8Array) => {
      if (mode === 'cleanup') return Promise.resolve({ status: 'stall' });
      const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (mode === 'normal' && header.getUint16(OFFSET_INS) === Actions.CMD_GET_DEVICE_VERSION) {
        const response = JSON.stringify({ firmwareVersion: '3.1.0', walletMFP: 'aabbccdd' });
        packets = encode(header.getUint16(OFFSET_INS), header.getUint16(OFFSET_LC), response).map(
          (packet: Uint8Array) => {
            const framed = new Uint8Array(packet.length + 2);
            framed.set(packet);
            return framed;
          }
        );
      }
      return Promise.resolve({ status: 'ok' });
    }),
    transferIn: jest.fn(() => {
      const packet = packets.shift();
      if (!packet) return new Promise<never>(() => {});
      return Promise.resolve({ status: 'ok', data: new DataView(packet.buffer) });
    }),
  };
  const usb = {
    getDevices: jest.fn().mockResolvedValue([device]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { usb } });
  return { device, usb, resumeCleanup };
}

const flush = () =>
  new Promise<void>(resolve => {
    setImmediate(resolve);
  });

describe('Keystone WebUSB vendor timeout', () => {
  let originalNavigator: PropertyDescriptor | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  });

  afterEach(() => {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
    jest.useRealTimers();
  });

  it('uses the vendor 15-second timeout for an unresponsive device-info request', async () => {
    const { device, usb } = syntheticUsb('silent');
    const connector = createKeystoneWebUsbConnector();
    const result = connector.connect().catch((error: unknown) => error);
    const settled = jest.fn();
    result.then(settled);
    await flush();
    expect(device.transferIn).toHaveBeenCalled();

    jest.advanceTimersByTime(USBTimeout - 1);
    await flush();
    expect(settled).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await expect(result).resolves.toMatchObject({
      code: HardwareErrorCode.OperationTimeout,
      params: { statusCode: Status.ERR_TIMEOUT },
    });
    expect(device.close).toHaveBeenCalledTimes(1);
    expect(usb.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('accepts a normal device-info response and clears its timeout', async () => {
    const { device } = syntheticUsb('normal');
    const connector = createKeystoneWebUsbConnector();
    const session = await connector.connect();

    jest.advanceTimersByTime(USBTimeout);
    await expect(connector.call(session.sessionId, 'getAppConfig', {})).resolves.toMatchObject({
      success: true,
    });
    expect(device.close).toHaveBeenCalledTimes(2);
    await connector.disconnect(session.sessionId);
  });

  it.each(['qr-hardware-call', 'eth-sign-request'])(
    'keeps the 100-second confirmation timeout for %s',
    async urType => {
      syntheticUsb('normal');
      const connector = createKeystoneWebUsbConnector();
      const session = await connector.connect();
      const result = connector.call(session.sessionId, 'resolveUr', { urType, urData: '00' });
      const settled = jest.fn();
      result.then(settled);
      await flush();

      jest.advanceTimersByTime(USBTimeout);
      await flush();
      expect(settled).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100_000 - USBTimeout);
      await expect(result).resolves.toMatchObject({
        success: false,
        error: { code: HardwareErrorCode.OperationTimeout },
      });
      await connector.disconnect(session.sessionId);
    }
  );

  it('honors an explicitly shorter caller timeout', async () => {
    syntheticUsb('silent');
    const connector = createKeystoneWebUsbConnector({ timeoutMs: 1000 });
    const result = connector.connect().catch((error: unknown) => error);
    await flush();

    jest.advanceTimersByTime(1000);
    await expect(result).resolves.toMatchObject({ code: HardwareErrorCode.OperationTimeout });
  });

  it('waits for vendor cleanup rather than adding a separate connection deadline', async () => {
    const { device, resumeCleanup } = syntheticUsb('cleanup');
    const connector = createKeystoneWebUsbConnector();
    const result = connector.connect().catch((error: unknown) => error);
    const settled = jest.fn();
    result.then(settled);
    try {
      await flush();
      expect(device.releaseInterface).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(USBTimeout);
      await flush();
      expect(settled).not.toHaveBeenCalled();
    } finally {
      resumeCleanup();
    }
    await expect(result).resolves.toMatchObject({
      code: HardwareErrorCode.TransportError,
      params: { statusCode: Status.ERR_RESPONSE_STATUS_NOT_OK },
    });
    expect(device.close).toHaveBeenCalledTimes(1);
  });
});
