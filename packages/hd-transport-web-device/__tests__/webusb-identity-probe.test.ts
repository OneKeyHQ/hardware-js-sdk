import WebUsbTransport from '../src/webusb';
import { probeUsbDeviceIdentities } from '@onekeyfe/hd-common-connect-sdk/src';

import type { MessageFromOneKey, TransportCallOptions } from '@onekeyfe/hd-transport';

jest.mock('@onekeyfe/hd-core', () => jest.requireActual('../../core/src'));
jest.mock('../../core/src/data/config', () => ({
  getSDKVersion: () => '1.0.0-test',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));
jest.mock('@onekeyfe/hd-transport-web-device', () => ({
  WebUsbTransport: jest.requireActual('../src/webusb').default,
}));
jest.mock('@onekeyfe/hd-transport-http', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@onekeyfe/hd-transport-lowlevel', () => ({}));
jest.mock('@onekeyfe/hd-transport-emulator', () => ({}));

describe('WebUSB identity probe ownership', () => {
  let originalNavigator: PropertyDescriptor | undefined;
  const device = {
    vendorId: 0x1209,
    productId: 0x53c1,
    serialNumber: 'USB_PATH',
    opened: false,
    close: jest.fn(),
  };
  let disconnectListener: (event: { device: typeof device }) => void;
  const usb = {
    getDevices: jest.fn(),
    addEventListener: jest.fn((_type, callback) => {
      disconnectListener = callback;
    }),
  };
  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    device.opened = false;
    device.close.mockReset().mockImplementation(() => {
      device.opened = false;
      return Promise.resolve();
    });
    usb.getDevices.mockResolvedValue([device]);
    usb.addEventListener.mockClear();
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { usb } });
  });
  afterEach(() => {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete (globalThis as { navigator?: Navigator }).navigator;
  });

  test('does not close a handle already opened by another operation', async () => {
    const probe = new WebUsbTransport(true);
    probe.init({ debug: jest.fn() });
    device.opened = true;
    await expect(probe.acquire({ path: 'USB_PATH' })).rejects.toThrow(
      'USB device is already in use'
    );
    expect(device.close).not.toHaveBeenCalled();
    expect(usb.addEventListener).not.toHaveBeenCalled();
  });

  test('does not borrow a handle while a normal native open is pending', async () => {
    const active = new WebUsbTransport();
    const probe = new WebUsbTransport(true);
    active.init({ debug: jest.fn() });
    probe.init({ debug: jest.fn() });
    let finishOpen!: () => void;
    let started!: () => void;
    const opening = new Promise<void>(resolve => {
      finishOpen = resolve;
    });
    const entered = new Promise<void>(resolve => {
      started = resolve;
    });
    const native = Object.assign(device, {
      open: jest.fn(async () => {
        started();
        await opening;
        device.opened = true;
      }),
      reset: jest.fn(),
      configurations: [],
      configuration: { configurationValue: 1 },
      selectConfiguration: jest.fn(),
      claimInterface: jest.fn(),
      clearHalt: jest.fn(),
    });
    jest.spyOn(active, 'findDevice').mockResolvedValue(native as unknown as USBDevice);
    const connecting = active.connectToDevice('USB_PATH', true);
    await entered;
    await expect(probe.acquire({ path: 'USB_PATH' })).rejects.toThrow(
      'USB device is already in use'
    );
    expect(device.close).not.toHaveBeenCalled();
    finishOpen();
    await connecting;
  });

  test('a normal connection cannot close an isolated probe handle and release closes the captured handle after re-enumeration', async () => {
    const probe = new WebUsbTransport(true);
    probe.init({ debug: jest.fn() });
    const internals = probe as unknown as {
      rotateProtocolV2UsbGeneration: () => Promise<void>;
      detectProtocol: () => Promise<'V1'>;
    };
    jest.spyOn(internals, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
    jest.spyOn(internals, 'detectProtocol').mockResolvedValue('V1');
    jest.spyOn(probe, 'connect').mockImplementation(() => {
      device.opened = true;
      return Promise.resolve();
    });
    await probe.acquire({ path: 'USB_PATH' });
    const active = new WebUsbTransport();
    active.init({ debug: jest.fn() });
    await expect(active.connectToDevice('USB_PATH', true)).rejects.toThrow(
      'USB device is already in use'
    );
    expect(device.close).not.toHaveBeenCalled();
    const replacement = { ...device, close: jest.fn() };
    usb.getDevices.mockResolvedValue([replacement]);
    await probe.getConnectedDevices();
    device.close.mockRejectedValueOnce(new Error('native close failed'));
    await expect(probe.release('USB_PATH')).rejects.toThrow('native close failed');
    await probe.enumerate();
    expect(device.close).toHaveBeenCalledTimes(2);
    expect(replacement.close).not.toHaveBeenCalled();
  });

  test('does not replace the active SDK disconnect observer', () => {
    const active = new WebUsbTransport();
    active.init({ debug: jest.fn() });
    const probe = new WebUsbTransport(true);
    probe.init({ debug: jest.fn() });
    const activeDisconnect = jest.spyOn(active, 'markProtocolStale');
    const probeDisconnect = jest.spyOn(probe, 'markProtocolStale');
    disconnectListener({ device });
    expect(activeDisconnect).toHaveBeenCalledWith('USB_PATH');
    expect(probeDisconnect).not.toHaveBeenCalled();
  });

  test.each(['release', 'acquire failure'])(
    'keeps a probe handle protected after close fails during %s and recovers after cleanup',
    async phase => {
      Object.assign(device, {
        open: jest.fn(() => {
          device.opened = true;
          return Promise.resolve();
        }),
        releaseInterface: jest.fn().mockResolvedValue(undefined),
        reset: jest.fn(),
        configurations: [],
        configuration: { configurationValue: 1 },
        selectConfiguration: jest.fn(),
        claimInterface: jest.fn(),
        clearHalt: jest.fn(),
      });
      const probe = new WebUsbTransport(true);
      probe.init({ debug: jest.fn() });
      const internals = probe as unknown as {
        rotateProtocolV2UsbGeneration: () => Promise<void>;
        detectProtocol: () => Promise<'V1'>;
      };
      jest.spyOn(internals, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
      jest.spyOn(internals, 'detectProtocol').mockResolvedValue('V1');
      jest.spyOn(probe, 'connect').mockImplementation(() => {
        device.opened = true;
        if (phase === 'acquire failure') return Promise.reject(new Error('probe failed'));
        return Promise.resolve();
      });
      const closeFailure = new Error('native close failed');
      device.close.mockRejectedValueOnce(closeFailure);
      if (phase === 'release') {
        await probe.acquire({ path: 'USB_PATH' });
        await expect(probe.release('USB_PATH')).rejects.toBe(closeFailure);
      } else {
        await expect(probe.acquire({ path: 'USB_PATH' })).rejects.toBe(closeFailure);
      }
      expect(device.opened).toBe(true);
      const active = new WebUsbTransport();
      active.init({ debug: jest.fn() });
      await expect(active.connectToDevice('USB_PATH', true)).rejects.toThrow(
        'USB device is already in use'
      );
      expect(device.close).toHaveBeenCalledTimes(1);

      await probe.release('USB_PATH');
      expect(device.opened).toBe(false);
      await expect(active.connectToDevice('USB_PATH', true)).resolves.toBeUndefined();
      expect(device.opened).toBe(true);
      await active.release('USB_PATH');
    }
  );

  test.each(['release', 'acquire failure'])(
    'the public probe retries failed %s cleanup on its next call',
    async phase => {
      const internals = WebUsbTransport.prototype as unknown as {
        rotateProtocolV2UsbGeneration: () => Promise<void>;
        detectProtocol: () => Promise<'V1'>;
      };
      jest.spyOn(internals, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
      jest.spyOn(internals, 'detectProtocol').mockResolvedValue('V1');
      jest.spyOn(WebUsbTransport.prototype, 'getProtocolType').mockReturnValue('V1');
      jest.spyOn(WebUsbTransport.prototype, 'configure').mockImplementation(() => undefined);
      jest
        .spyOn(WebUsbTransport.prototype, 'configureProtocolV2')
        .mockImplementation(() => undefined);
      const connect = jest.spyOn(WebUsbTransport.prototype, 'connect').mockImplementation(() => {
        device.opened = true;
        return Promise.resolve();
      });
      if (phase === 'acquire failure') {
        connect.mockImplementationOnce(() => {
          device.opened = true;
          return Promise.reject(new Error('probe failed'));
        });
      }
      jest.spyOn(WebUsbTransport.prototype, 'call').mockResolvedValue({
        type: 'Features',
        message: { onekey_serial_no: 'PHYSICAL_SERIAL', onekey_device_type: 'CLASSIC1S' },
      });
      device.close.mockRejectedValueOnce(new Error('native close failed'));
      try {
        await expect(probeUsbDeviceIdentities({ commType: 'webusb' })).resolves.toEqual([]);
        expect(device.opened).toBe(true);
        const active = new WebUsbTransport();
        active.init({ debug: jest.fn() });
        await expect(active.connectToDevice('USB_PATH', true)).rejects.toThrow(
          'USB device is already in use'
        );
        device.close.mockRejectedValueOnce(new Error('native close still failing'));
        await expect(probeUsbDeviceIdentities({ commType: 'webusb' })).resolves.toEqual([]);
        expect(device.opened).toBe(true);
        expect(connect).toHaveBeenCalledTimes(1);
        expect(device.close).toHaveBeenCalledTimes(2);
        await expect(probeUsbDeviceIdentities({ commType: 'webusb' })).resolves.toMatchObject([
          { path: 'USB_PATH', serialNo: 'PHYSICAL_SERIAL' },
        ]);
        expect(connect).toHaveBeenCalledTimes(2);
        expect(device.opened).toBe(false);
      } finally {
        jest.restoreAllMocks();
      }
    }
  );

  test.each([false, true])(
    'uses a read-only V1 probe only for isolated discovery (%s)',
    async identityProbe => {
      const probe = new WebUsbTransport(identityProbe);
      const internals = probe as unknown as {
        messages: object;
        callProtocolV1: (
          path: string,
          name: string,
          data: object,
          options: TransportCallOptions
        ) => Promise<MessageFromOneKey>;
        probeProtocolV1: (path: string) => Promise<boolean>;
      };
      internals.messages = {};
      const call = jest
        .spyOn(internals, 'callProtocolV1')
        .mockResolvedValue({ type: 'Features', message: {} });
      await expect(internals.probeProtocolV1('USB_PATH')).resolves.toBe(true);
      expect(call.mock.calls[0][1]).toBe(identityProbe ? 'GetFeatures' : 'Initialize');
    }
  );
});
