import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import WebUsbTransport from '../src/webusb';
import { probeUsbDeviceIdentities } from '@onekeyfe/hd-common-connect-sdk/src';
import Core, { switchTransport } from '@onekeyfe/hd-core/src/core';
import DataManager from '@onekeyfe/hd-core/src/data-manager/DataManager';
import TransportManager from '@onekeyfe/hd-core/src/data-manager/TransportManager';
import { Device } from '@onekeyfe/hd-core/src/device/Device';

import type { MessageFromOneKey, Transport, TransportCallOptions } from '@onekeyfe/hd-transport';

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

type PacketIoTransport = {
  rotateProtocolV2UsbGeneration: () => Promise<void>;
  detectProtocol: () => Promise<'V1' | 'V2'>;
  transferInWithRetry: (path: string, length: number) => Promise<DataView>;
  transferInOnce: (path: string, length: number) => Promise<DataView>;
  transferOutWithRetry: (path: string, packet: Uint8Array) => Promise<void>;
  transferOutOnce: (path: string, packet: Uint8Array) => Promise<void>;
  reconnectForPacketIoRetry: (
    path: string,
    direction: 'in' | 'out',
    attempt: number,
    error: unknown
  ) => Promise<void>;
};

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

  function createAcquiredTransport(protocol: 'V1' | 'V2' = 'V1') {
    const active = new WebUsbTransport();
    active.init({ debug: jest.fn() });
    jest
      .spyOn(active as unknown as PacketIoTransport, 'detectProtocol')
      .mockResolvedValue(protocol);
    jest.spyOn(active, 'connect').mockImplementation(() => {
      device.opened = true;
      return Promise.resolve();
    });
    return active;
  }

  test.each(['V1', 'V2'] as const)(
    'reacquires %s USB after keepSession and switching away and back',
    async protocol => {
      const previous = TransportManager.transport;
      const { settings } = DataManager;
      const active = createAcquiredTransport(protocol);
      const next = createAcquiredTransport(protocol);
      const selected = new Device({
        path: 'USB_PATH',
        id: 'USB_PATH',
        name: 'Mock device',
        commType: 'webusb',
        debug: false,
      });
      selected.keepSession = true;
      selected.mainId = 'USB_PATH';
      jest.spyOn(selected, 'isUsedHere').mockReturnValue(true);
      const release = jest.spyOn(active, 'release');
      const Emulator = jest.fn(() => ({ stop: jest.fn().mockResolvedValue(undefined) }));
      const RestoreUsb = jest.fn(() => next);
      TransportManager.transport = active as unknown as Transport;
      try {
        await active.acquire({ path: 'USB_PATH' });
        await selected.release();
        expect(release).not.toHaveBeenCalled();
        await switchTransport({ env: 'emulator', Transport: Emulator });
        expect(device.opened).toBe(false);
        await switchTransport({ env: 'webusb', Transport: RestoreUsb });
        await expect(next.acquire({ path: 'USB_PATH' })).resolves.toBe('USB_PATH');
      } finally {
        await active.stop();
        await next.stop();
        TransportManager.transport = previous;
        DataManager.settings = settings;
        jest.restoreAllMocks();
      }
    }
  );

  test('does not replace the transport until USB cleanup completes, or after it fails', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const active = createAcquiredTransport();
    const closing = createDeferred<void>();
    const entered = createDeferred<void>();
    device.close.mockImplementation(() => {
      entered.resolve();
      return closing.promise;
    });
    const Emulator = jest.fn();
    TransportManager.transport = active as unknown as Transport;
    try {
      await active.acquire({ path: 'USB_PATH' });
      const switching = Promise.resolve(switchTransport({ env: 'emulator', Transport: Emulator }));
      const result = switching.catch(error => error as Error);
      await Promise.resolve();
      expect(Emulator).not.toHaveBeenCalled();
      await entered.promise;
      expect(Emulator).not.toHaveBeenCalled();
      expect(TransportManager.transport).toBe(active);
      closing.reject(new Error('close failed'));
      expect(await result).toEqual(new Error('close failed'));
      expect(TransportManager.transport).toBe(active);
      expect(DataManager.settings).toBe(settings);
    } finally {
      closing.resolve();
      device.close.mockImplementation(() => {
        device.opened = false;
        return Promise.resolve();
      });
      await active.stop();
      TransportManager.transport = previous;
      DataManager.settings = settings;
      jest.restoreAllMocks();
    }
  });

  test('serializes overlapping transport switches and stops each replaced instance', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const active = createAcquiredTransport();
    const next = createAcquiredTransport();
    const closing = createDeferred<void>();
    const entered = createDeferred<void>();
    const emulatorCleanup = createDeferred<void>();
    device.close.mockImplementation(() => {
      entered.resolve();
      return closing.promise.then(() => {
        device.opened = false;
      });
    });
    const emulator = { stop: jest.fn(() => emulatorCleanup.promise) };
    const Emulator = jest.fn(() => emulator);
    const RestoreUsb = jest.fn(() => next);
    TransportManager.transport = active as unknown as Transport;
    try {
      await active.acquire({ path: 'USB_PATH' });
      const first = switchTransport({ env: 'emulator', Transport: Emulator });
      await entered.promise;
      const second = switchTransport({ env: 'webusb', Transport: RestoreUsb });
      closing.resolve();
      await first;
      await Promise.resolve();
      expect(emulator.stop).toHaveBeenCalledTimes(1);
      expect(RestoreUsb).not.toHaveBeenCalled();
      emulatorCleanup.resolve();
      await second;
      expect(TransportManager.transport).toBe(next);
    } finally {
      closing.resolve();
      emulatorCleanup.resolve();
      await active.stop();
      await next.stop();
      TransportManager.transport = previous;
      DataManager.settings = settings;
      jest.restoreAllMocks();
    }
  });

  test.each(['V1', 'V2'] as const)(
    'Core disposal releases a retained %s USB session for a new transport',
    async protocol => {
      const active = createAcquiredTransport(protocol);
      const next = createAcquiredTransport(protocol);
      const selected = new Device({
        path: 'USB_PATH',
        id: 'USB_PATH',
        name: 'Mock device',
        commType: 'webusb',
        debug: false,
      });
      selected.keepSession = true;
      selected.mainId = 'USB_PATH';
      jest.spyOn(selected, 'isUsedHere').mockReturnValue(true);
      const release = jest.spyOn(active, 'release');
      jest.spyOn(TransportManager, 'getTransport').mockReturnValue(active as unknown as Transport);
      const core = new Core();
      try {
        await active.acquire({ path: 'USB_PATH' });
        await selected.release();
        expect(release).not.toHaveBeenCalled();
        expect(device.opened).toBe(true);
        await core.dispose();
        await core.dispose();
        expect(device.opened).toBe(false);
        expect(device.close).toHaveBeenCalledTimes(1);
        await expect(next.acquire({ path: 'USB_PATH' })).resolves.toBe('USB_PATH');
      } finally {
        await active.release('USB_PATH');
        await next.release('USB_PATH');
        jest.restoreAllMocks();
      }
    }
  );

  test('stop waits for a pending native open and closes its captured handle', async () => {
    const entered = createDeferred<void>();
    const opening = createDeferred<void>();
    const native = Object.assign(device, {
      open: jest.fn(async () => {
        entered.resolve();
        await opening.promise;
        device.opened = true;
      }),
      reset: jest.fn(),
      configurations: [],
      configuration: { configurationValue: 1 },
      selectConfiguration: jest.fn(),
      claimInterface: jest.fn(),
      clearHalt: jest.fn(),
    });
    const active = new WebUsbTransport();
    active.init({ debug: jest.fn() });
    const connecting = active.connectToDevice('USB_PATH', true);
    const result = expect(connecting).rejects.toThrow('WebUSB transport is stopped');
    try {
      await entered.promise;
      let stopped = false;
      const stopping = active.stop().then(() => {
        stopped = true;
      });
      await Promise.resolve();
      expect(stopped).toBe(false);
      opening.resolve();
      await result;
      await stopping;
      expect(native.reset).not.toHaveBeenCalled();
      expect(native.claimInterface).not.toHaveBeenCalled();
      expect(device.opened).toBe(false);
      const next = createAcquiredTransport();
      await expect(next.acquire({ path: 'USB_PATH' })).resolves.toBe('USB_PATH');
      await next.release('USB_PATH');
    } finally {
      opening.resolve();
      await connecting.catch(() => undefined);
      await active.release('USB_PATH');
      jest.restoreAllMocks();
    }
  });

  test.each(['read', 'read retry', 'write', 'write retry'])(
    'stop rejects a late native %s result without touching the new owner',
    async operation => {
      const entered = createDeferred<void>();
      const packet = createDeferred<{ status: 'ok'; data: DataView; bytesWritten: number }>();
      Object.assign(device, {
        transferIn: jest.fn(() => {
          entered.resolve();
          return packet.promise;
        }),
        transferOut: jest.fn(() => {
          entered.resolve();
          return packet.promise;
        }),
      });
      const active = createAcquiredTransport();
      const next = createAcquiredTransport();
      await active.acquire({ path: 'USB_PATH' });
      const state = active as unknown as PacketIoTransport;
      let call: Promise<unknown>;
      if (operation === 'read') call = state.transferInOnce('USB_PATH', 64);
      else if (operation === 'read retry') call = state.transferInWithRetry('USB_PATH', 64);
      else if (operation === 'write') call = state.transferOutOnce('USB_PATH', new Uint8Array([1]));
      else call = state.transferOutWithRetry('USB_PATH', new Uint8Array([1]));
      const result = expect(call).rejects.toThrow('WebUSB transport is stopped');
      try {
        await entered.promise;
        await active.stop();
        await next.acquire({ path: 'USB_PATH' });
        packet.resolve({ status: 'ok', data: new DataView(new ArrayBuffer(64)), bytesWritten: 1 });
        await result;
        expect(device.close).toHaveBeenCalledTimes(1);
        expect(device.opened).toBe(true);
      } finally {
        packet.resolve({ status: 'ok', data: new DataView(new ArrayBuffer(64)), bytesWritten: 1 });
        await call.catch(() => undefined);
        await active.release('USB_PATH');
        await next.release('USB_PATH');
        jest.restoreAllMocks();
      }
    }
  );

  test.each(['in', 'out'] as const)(
    'stop prevents a delayed transfer%s retry from closing or reopening the new owner',
    async direction => {
      const entered = createDeferred<void>();
      const native = Object.assign(device, {
        transferIn: jest.fn().mockRejectedValue(new Error('transferIn NetworkError')),
        transferOut: jest.fn().mockRejectedValue(new Error('transferOut NetworkError')),
      });
      const active = createAcquiredTransport();
      const next = createAcquiredTransport();
      await active.acquire({ path: 'USB_PATH' });
      const state = active as unknown as PacketIoTransport;
      const retry = state.reconnectForPacketIoRetry.bind(active);
      jest.spyOn(state, 'reconnectForPacketIoRetry').mockImplementation((...args) => {
        entered.resolve();
        return retry(...args);
      });
      const call =
        direction === 'in'
          ? state.transferInWithRetry('USB_PATH', 64)
          : state.transferOutWithRetry('USB_PATH', new Uint8Array([1]));
      const result = expect(call).rejects.toThrow('WebUSB transport is stopped');
      try {
        await entered.promise;
        await active.stop();
        await next.acquire({ path: 'USB_PATH' });
        await result;
        expect(native[direction === 'in' ? 'transferIn' : 'transferOut']).toHaveBeenCalledTimes(1);
        expect(device.close).toHaveBeenCalledTimes(1);
        expect(device.opened).toBe(true);
      } finally {
        await call.catch(() => undefined);
        await active.release('USB_PATH');
        await next.release('USB_PATH');
        jest.restoreAllMocks();
      }
    }
  );

  test('failed stop keeps ownership until a later discovery confirms native closure', async () => {
    const active = createAcquiredTransport();
    const next = createAcquiredTransport();
    const failure = new Error('native close failed');
    await active.acquire({ path: 'USB_PATH' });
    device.close.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    try {
      await expect(active.stop()).rejects.toBe(failure);
      await next.getConnectedDevices();
      await expect(next.acquire({ path: 'USB_PATH' })).rejects.toThrow(
        'USB device is already in use'
      );
      expect(device.opened).toBe(true);
      await next.getConnectedDevices();
      expect(device.opened).toBe(false);
      await expect(next.acquire({ path: 'USB_PATH' })).resolves.toBe('USB_PATH');
      expect(device.close).toHaveBeenCalledTimes(3);
    } finally {
      await active.release('USB_PATH');
      await next.release('USB_PATH');
      jest.restoreAllMocks();
    }
  });

  test('stop closes captured handles across paths without closing re-enumerated or foreign handles', async () => {
    const other = {
      ...device,
      serialNumber: 'OTHER_PATH',
      close: jest.fn(() => {
        other.opened = false;
        return Promise.resolve();
      }),
    };
    const foreign = { ...device, serialNumber: 'FOREIGN_PATH', close: jest.fn() };
    usb.getDevices.mockResolvedValue([device, other, foreign]);
    const active = createAcquiredTransport();
    jest.spyOn(active, 'connect').mockImplementation(path => {
      (path === 'USB_PATH' ? device : other).opened = true;
      return Promise.resolve();
    });
    const current = createAcquiredTransport();
    jest.spyOn(current, 'connect').mockImplementation(() => {
      foreign.opened = true;
      return Promise.resolve();
    });
    const currentDisconnect = jest.spyOn(current, 'markProtocolStale');
    try {
      await active.acquire({ path: 'USB_PATH' });
      await active.acquire({ path: 'OTHER_PATH' });
      await current.acquire({ path: 'FOREIGN_PATH' });
      const replacement = { ...device, opened: false, close: jest.fn() };
      usb.getDevices.mockResolvedValue([replacement, foreign]);
      await active.getConnectedDevices();
      await active.stop();
      expect(device.opened).toBe(false);
      expect(other.opened).toBe(false);
      expect(replacement.close).not.toHaveBeenCalled();
      expect(foreign.close).not.toHaveBeenCalled();
      expect(foreign.opened).toBe(true);
      disconnectListener({ device: replacement });
      expect(currentDisconnect).toHaveBeenCalledWith('USB_PATH');
    } finally {
      await active.release('USB_PATH');
      await active.release('OTHER_PATH');
      await current.release('FOREIGN_PATH');
      jest.restoreAllMocks();
    }
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
    await active.release('USB_PATH');
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

  test.each(['in', 'out'] as const)(
    'the public probe cannot take over a first acquire while transfer%s recovery has closed the handle',
    async direction => {
      const closed = createDeferred<void>();
      const resume = createDeferred<void>();
      Object.assign(device, {
        open: jest.fn(() => {
          device.opened = true;
          return Promise.resolve();
        }),
        releaseInterface: jest.fn(),
        reset: jest.fn(),
        configurations: [],
        configuration: { configurationValue: 1 },
        selectConfiguration: jest.fn(),
        claimInterface: jest.fn(),
        clearHalt: jest.fn(),
        transferIn: jest
          .fn()
          .mockResolvedValue({ status: 'ok', data: new DataView(new ArrayBuffer(64)) }),
        transferOut: jest.fn().mockResolvedValue({ status: 'ok' }),
      });
      const native = device as typeof device & { transferIn: jest.Mock; transferOut: jest.Mock };
      native[direction === 'in' ? 'transferIn' : 'transferOut'].mockRejectedValueOnce(
        new Error(`transfer${direction} NetworkError`)
      );
      device.close.mockImplementationOnce(async () => {
        device.opened = false;
        closed.resolve();
        await resume.promise;
      });
      const active = new WebUsbTransport();
      active.init({ debug: jest.fn() });
      const internals = active as unknown as PacketIoTransport;
      jest
        .spyOn(
          WebUsbTransport.prototype as unknown as PacketIoTransport,
          'rotateProtocolV2UsbGeneration'
        )
        .mockResolvedValue(undefined);
      jest
        .spyOn(WebUsbTransport.prototype as unknown as PacketIoTransport, 'detectProtocol')
        .mockImplementation(async function (this: WebUsbTransport) {
          if (this !== active) return 'V1';
          if (direction === 'in') await internals.transferInWithRetry('USB_PATH', 64);
          else await internals.transferOutWithRetry('USB_PATH', new Uint8Array([1]));
          return 'V1';
        });
      jest.spyOn(WebUsbTransport.prototype, 'getProtocolType').mockReturnValue('V1');
      jest.spyOn(WebUsbTransport.prototype, 'configure').mockImplementation(() => undefined);
      jest
        .spyOn(WebUsbTransport.prototype, 'configureProtocolV2')
        .mockImplementation(() => undefined);
      jest
        .spyOn(WebUsbTransport.prototype, 'connect')
        .mockImplementation(async function (this: WebUsbTransport, path, first) {
          if (this === active && !first) return this.connectToDevice(path, first);
          device.opened = true;
        });
      jest.spyOn(WebUsbTransport.prototype, 'call').mockResolvedValue({
        type: 'Features',
        message: { onekey_serial_no: 'PHYSICAL_SERIAL', onekey_device_type: 'CLASSIC1S' },
      });
      try {
        const acquiring = active.acquire({ path: 'USB_PATH' });
        try {
          await closed.promise;
          await expect(probeUsbDeviceIdentities({ commType: 'webusb' })).resolves.toEqual([]);
          resume.resolve();
          await expect(acquiring).resolves.toBe('USB_PATH');
        } finally {
          resume.resolve();
          await acquiring.catch(() => undefined);
          await active.release('USB_PATH');
        }
        await expect(probeUsbDeviceIdentities({ commType: 'webusb' })).resolves.toMatchObject([
          { serialNo: 'PHYSICAL_SERIAL' },
        ]);
      } finally {
        jest.restoreAllMocks();
      }
    }
  );

  test('releases ownership after a failed normal acquire', async () => {
    const active = new WebUsbTransport();
    const probe = new WebUsbTransport(true);
    active.init({ debug: jest.fn() });
    probe.init({ debug: jest.fn() });
    const state = active as unknown as PacketIoTransport;
    jest.spyOn(state, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
    jest.spyOn(active, 'connect').mockImplementation(() => {
      device.opened = true;
      return Promise.resolve();
    });
    jest.spyOn(state, 'detectProtocol').mockRejectedValue(new Error('protocol failed'));
    await expect(active.acquire({ path: 'USB_PATH' })).rejects.toThrow('protocol failed');
    expect(device.opened).toBe(false);
    const probeState = probe as unknown as PacketIoTransport;
    jest.spyOn(probeState, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
    jest.spyOn(probeState, 'detectProtocol').mockResolvedValue('V1');
    jest.spyOn(probe, 'connect').mockImplementation(() => {
      device.opened = true;
      return Promise.resolve();
    });
    try {
      await expect(probe.acquire({ path: 'USB_PATH' })).resolves.toBe('USB_PATH');
    } finally {
      await probe.release('USB_PATH');
    }
  });

  test('releasing one path preserves another closed handle owned by the same transport', async () => {
    const other = {
      ...device,
      serialNumber: 'OTHER_PATH',
      opened: false,
      close: jest.fn(() => {
        other.opened = false;
        return Promise.resolve();
      }),
    };
    usb.getDevices.mockResolvedValue([device, other]);
    const active = new WebUsbTransport();
    active.init({ debug: jest.fn() });
    const state = active as unknown as PacketIoTransport;
    jest.spyOn(state, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
    jest.spyOn(state, 'detectProtocol').mockResolvedValue('V1');
    jest.spyOn(active, 'connect').mockImplementation(path => {
      const target = path === 'USB_PATH' ? device : other;
      target.opened = true;
      return Promise.resolve();
    });
    await active.acquire({ path: 'USB_PATH' });
    await active.acquire({ path: 'OTHER_PATH' });
    await active.release('USB_PATH');
    other.opened = false;
    const probe = new WebUsbTransport(true);
    probe.init({ debug: jest.fn() });
    const probeState = probe as unknown as PacketIoTransport;
    jest.spyOn(probeState, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
    jest.spyOn(probeState, 'detectProtocol').mockResolvedValue('V1');
    jest.spyOn(probe, 'connect').mockImplementation(path => {
      const target = path === 'USB_PATH' ? device : other;
      target.opened = true;
      return Promise.resolve();
    });
    try {
      await expect(probe.acquire({ path: 'USB_PATH' })).resolves.toBe('USB_PATH');
      await expect(probe.acquire({ path: 'OTHER_PATH' })).rejects.toThrow(
        'USB device is already in use'
      );
    } finally {
      await active.release('OTHER_PATH');
      await probe.release('USB_PATH');
    }
  });

  test.each(['read', 'read retry', 'write', 'write retry', 'retry cleanup'])(
    'blocks native %s while an isolated probe owns the handle',
    async operation => {
      const probe = new WebUsbTransport(true);
      probe.init({ debug: jest.fn() });
      const probeState = probe as unknown as PacketIoTransport;
      jest.spyOn(probeState, 'rotateProtocolV2UsbGeneration').mockResolvedValue(undefined);
      jest.spyOn(probeState, 'detectProtocol').mockResolvedValue('V1');
      jest.spyOn(probe, 'connect').mockImplementation(() => {
        device.opened = true;
        return Promise.resolve();
      });
      const native = Object.assign(device, {
        releaseInterface: jest.fn(),
        transferIn: jest
          .fn()
          .mockResolvedValue({ status: 'ok', data: new DataView(new ArrayBuffer(64)) }),
        transferOut: jest.fn().mockResolvedValue({ status: 'ok' }),
      });
      await probe.acquire({ path: 'USB_PATH' });
      const active = new WebUsbTransport();
      active.init({ debug: jest.fn() });
      const state = active as unknown as PacketIoTransport;
      try {
        let call: Promise<unknown>;
        if (operation === 'read') call = state.transferInOnce('USB_PATH', 64);
        else if (operation === 'read retry') call = state.transferInWithRetry('USB_PATH', 64);
        else if (operation === 'write')
          call = state.transferOutOnce('USB_PATH', new Uint8Array([1]));
        else if (operation === 'write retry')
          call = state.transferOutWithRetry('USB_PATH', new Uint8Array([1]));
        else
          call = state.reconnectForPacketIoRetry(
            'USB_PATH',
            'in',
            0,
            new Error('transferIn failed')
          );
        await expect(call).rejects.toThrow('USB device is already in use');
        expect(native.transferIn).not.toHaveBeenCalled();
        expect(native.transferOut).not.toHaveBeenCalled();
        expect(native.releaseInterface).not.toHaveBeenCalled();
        expect(device.close).not.toHaveBeenCalled();
      } finally {
        await probe.release('USB_PATH');
      }
    }
  );

  test.each(['in', 'out'] as const)(
    'ends transfer%s immediately if reconnect reports an ownership conflict',
    async direction => {
      const active = new WebUsbTransport();
      active.init({ debug: jest.fn() });
      device.opened = true;
      const native = Object.assign(device, {
        transferIn: jest.fn().mockRejectedValue(new Error('transferIn NetworkError')),
        transferOut: jest.fn().mockRejectedValue(new Error('transferOut NetworkError')),
      });
      const state = active as unknown as PacketIoTransport;
      const conflict = ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'USB device is already in use'
      );
      const reconnect = jest.spyOn(state, 'reconnectForPacketIoRetry').mockRejectedValue(conflict);
      const call =
        direction === 'in'
          ? state.transferInWithRetry('USB_PATH', 64)
          : state.transferOutWithRetry('USB_PATH', new Uint8Array([1]));
      await expect(call).rejects.toBe(conflict);
      expect(reconnect).toHaveBeenCalledTimes(1);
      expect(native[direction === 'in' ? 'transferIn' : 'transferOut']).toHaveBeenCalledTimes(1);
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
