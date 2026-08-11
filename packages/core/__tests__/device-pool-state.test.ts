import { DevicePool } from '../src/device/DevicePool';
import { Device } from '../src/device/Device';
import { DEVICE } from '../src/events';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('DevicePool state lifecycle', () => {
  beforeEach(() => {
    DevicePool.dispose();
  });

  afterEach(() => {
    DevicePool.dispose();
  });

  test('refreshes runtime state for a cached Protocol V2 discovery result', async () => {
    const descriptor = { path: 'pro2-path', protocolType: 'V2' } as any;
    const getDeviceState = jest.fn().mockResolvedValue({ status: { mode: 'normal' } });
    const device = {
      originalDescriptor: descriptor,
      updateDescriptor: jest.fn(),
      isProtocolV2: () => true,
      getDeviceState,
      run: jest.fn(async (callback: () => Promise<void>) => callback()),
    } as any;
    DevicePool.devicesCache = { 'pro2-id': device };

    await DevicePool.getDevices([descriptor], 'pro2-id', {
      connectProtocol: 'V2',
      refreshRuntimeState: true,
    });

    expect(device.run).toHaveBeenCalledTimes(1);
    expect(getDeviceState).toHaveBeenNthCalledWith(1, { refreshSections: ['status'] });
    expect(getDeviceState).toHaveBeenNthCalledWith(2, { refreshSections: ['settings'] });
  });

  test('refreshes Protocol V2 discovery state without legacy-specific options', async () => {
    const getDeviceState = jest.fn().mockResolvedValue({ status: { mode: 'bootloader' } });
    const run = jest.fn(async (callback: () => Promise<void>) => callback());
    const device = {
      isProtocolV2: () => true,
      getDeviceState,
      run,
    } as any;

    await (DevicePool as any)._refreshRuntimeState(device, {
      refreshRuntimeState: true,
    });

    expect(run).toHaveBeenCalledWith(expect.any(Function), {
      connectProtocol: undefined,
      forceProtocolDetection: undefined,
    });
    expect(getDeviceState).toHaveBeenNthCalledWith(1, {
      refreshSections: ['status'],
    });
    expect(getDeviceState).toHaveBeenNthCalledWith(2, {
      refreshSections: ['settings'],
    });
  });

  test('actively re-detects a cached device when protocol detection is forced', async () => {
    const descriptor = { path: 'cached-path', protocolType: 'V1' } as any;
    const device = Device.fromDescriptor(descriptor);
    const acquire = jest.spyOn(device, 'acquire').mockImplementation(() => {
      device.originalDescriptor.protocolType = 'V2';
      return Promise.resolve(true);
    });
    const initialize = jest.spyOn(device, 'initialize').mockResolvedValue(undefined);
    const release = jest.spyOn(device, 'release').mockResolvedValue(undefined);
    DevicePool.devicesCache = { 'cached-id': device };

    const result = await DevicePool.getDevices([descriptor], 'cached-id', {
      forceProtocolDetection: true,
    });

    expect(acquire).toHaveBeenCalledWith(undefined, { forceProtocolDetection: true });
    expect(initialize).toHaveBeenCalledWith({ forceProtocolDetection: true });
    expect(release).toHaveBeenCalledTimes(1);
    expect(device.originalDescriptor.protocolType).toBe('V2');
    expect(result.deviceList).toEqual([device]);
  });

  test('keeps a discovered device when its Protocol V2 label cannot be read', async () => {
    const labelError = new Error('settings unavailable');
    const getDeviceState = jest
      .fn()
      .mockResolvedValueOnce({ status: { mode: 'normal' } })
      .mockRejectedValueOnce(labelError);
    const device = {
      isProtocolV2: () => true,
      getDeviceState,
      run: jest.fn(async (callback: () => Promise<void>) => callback()),
    } as any;

    await expect(
      (DevicePool as any)._refreshRuntimeState(device, { refreshRuntimeState: true })
    ).resolves.toBeUndefined();
    expect(getDeviceState).toHaveBeenCalledTimes(2);
  });

  test('uses the disconnected descriptor and invalidates its cached state', () => {
    const descriptor = { path: 'pro2-path', protocolType: 'V2' } as any;
    const device = {
      originalDescriptor: descriptor,
      markTransportDisconnected: jest.fn(),
    } as any;
    DevicePool.devicesCache = { 'pro2-id': device };
    DevicePool.disconnectPool = [descriptor];
    const onDisconnect = jest.fn();
    DevicePool.emitter.on(DEVICE.DISCONNECT, onDisconnect);

    (DevicePool as any)._sendDisconnectMessage();

    expect(device.markTransportDisconnected).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(device);
    expect(DevicePool.disconnectPool).toEqual([]);
  });

  test('preserves shared listeners when resetting cached device state', () => {
    const listener = jest.fn();
    DevicePool.emitter.on(DEVICE.CONNECT, listener);
    DevicePool.devicesCache = { stale: {} as Device };

    DevicePool.resetState();
    DevicePool.emitter.emit(DEVICE.CONNECT, { path: 'next-device' });

    expect(DevicePool.devicesCache).toEqual({});
    expect(listener).toHaveBeenCalledWith({ path: 'next-device' });
  });

  test('releases a newly created device when initialization fails', async () => {
    const descriptor = { path: 'pro2-path', protocolType: 'V2' } as any;
    const release = jest.fn().mockResolvedValue(undefined);
    const device = {
      connect: jest.fn().mockResolvedValue(true),
      initialize: jest.fn().mockRejectedValue(new Error('initialize failed')),
      release,
    } as any;
    const fromDescriptor = jest.spyOn(Device, 'fromDescriptor').mockReturnValue(device);

    try {
      await expect((DevicePool as any)._createDevice(descriptor)).rejects.toThrow(
        'initialize failed'
      );
    } finally {
      fromDescriptor.mockRestore();
    }

    expect(release).toHaveBeenCalledTimes(1);
  });

  test('releases the cached device before surfacing a runtime refresh error', async () => {
    const refreshError = new Error('status failed');
    let callbackRejected = false;
    const device = {
      isProtocolV2: () => true,
      getDeviceState: jest.fn().mockRejectedValue(refreshError),
      run: jest.fn(async (callback: () => Promise<void>) => {
        try {
          await callback();
        } catch {
          callbackRejected = true;
        }
      }),
    } as any;

    await expect(
      (DevicePool as any)._refreshRuntimeState(device, { refreshRuntimeState: true })
    ).rejects.toBe(refreshError);
    expect(callbackRejected).toBe(false);
  });

  test('releases an acquired device when reinitialization fails', async () => {
    const device = Device.fromDescriptor({ path: 'pro2-path', protocolType: 'V2' } as any);
    (device as any).commands = { disposed: true };
    jest.spyOn(device, 'acquire').mockResolvedValue(true);
    jest.spyOn(device, 'initialize').mockRejectedValue(new Error('reinitialize failed'));
    const release = jest.spyOn(device, 'release').mockResolvedValue(undefined);

    await expect(device.run(jest.fn().mockResolvedValue(undefined))).rejects.toThrow(
      'reinitialize failed'
    );

    expect(release).toHaveBeenCalledTimes(1);
  });
});
