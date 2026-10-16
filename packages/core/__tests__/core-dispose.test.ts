import { HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import Core, { init, initConnector, initCore, switchTransport } from '../src/core';
import DataManager from '../src/data-manager/DataManager';
import TransportManager from '../src/data-manager/TransportManager';
import { DevicePool } from '../src/device/DevicePool';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

describe('Core.dispose', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('幂等停止 Connector 和 Transport，并重置共享设备状态', async () => {
    const connector = initConnector();
    const connectorStop = jest.spyOn(connector, 'stop');
    const transportStop = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(TransportManager, 'getTransport').mockReturnValue({ stop: transportStop } as never);
    const disposeDevicePool = jest.spyOn(DevicePool, 'dispose');
    const core = new Core();

    const firstDispose = core.dispose();
    expect(connectorStop).toHaveBeenCalledTimes(1);
    expect(transportStop).toHaveBeenCalledTimes(1);
    expect(disposeDevicePool).toHaveBeenCalledTimes(1);

    await firstDispose;
    await core.dispose();
    expect(connectorStop).toHaveBeenCalledTimes(1);
    expect(transportStop).toHaveBeenCalledTimes(1);
    expect(disposeDevicePool).toHaveBeenCalledTimes(1);
  });

  test('disposal rejects a queued switch without recreating a transport or connector', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const active = { stop: jest.fn().mockResolvedValue(undefined) };
    const replacement = jest.fn(() => ({ stop: jest.fn().mockResolvedValue(undefined) }));
    TransportManager.transport = active as never;
    const core = initCore();
    initConnector();
    const switching = switchTransport({ env: 'emulator', Transport: replacement });
    const rejected = expect(switching).rejects.toMatchObject({
      errorCode: HardwareErrorCode.NotInitialized,
    });
    try {
      await core.dispose();
      await rejected;
      expect(replacement).not.toHaveBeenCalled();
      expect(TransportManager.transport).toBe(active);
      expect(DataManager.settings).toBe(settings);
      expect(DevicePool.emitter.eventNames()).toHaveLength(0);
    } finally {
      await Promise.allSettled([switching]);
      await core.dispose();
      TransportManager.transport = previous;
      DataManager.settings = settings;
    }
  });

  test.each(['dispose/reinit', 'init', 'initCore'] as const)(
    '%s invalidates running and queued switches without blocking a new lifecycle',
    async lifecycle => {
      const previous = TransportManager.transport;
      const { settings } = DataManager;
      const entered = createDeferred<void>();
      const closing = createDeferred<void>();
      const loading = createDeferred<void>();
      const active = {
        stop: jest.fn(() => {
          entered.resolve();
          return closing.promise;
        }),
      };
      const intermediate = jest.fn(() => ({ stop: jest.fn().mockResolvedValue(undefined) }));
      const stale = jest.fn(() => ({ stop: jest.fn().mockResolvedValue(undefined) }));
      const fresh = { stop: jest.fn().mockResolvedValue(undefined) };
      const current = { stop: jest.fn().mockResolvedValue(undefined) };
      const Fresh = jest.fn(() => fresh);
      jest.spyOn(DataManager, 'load').mockImplementation(async next => {
        await loading.promise;
        DataManager.settings = next;
      });
      TransportManager.transport = active as never;
      let core = initCore();
      initConnector();
      const first = switchTransport({ env: 'emulator', Transport: intermediate });
      await entered.promise;
      const second = switchTransport({ env: 'webusb', Transport: stale });
      const rejected = Promise.all([
        expect(first).rejects.toMatchObject({ errorCode: HardwareErrorCode.NotInitialized }),
        expect(second).rejects.toMatchObject({ errorCode: HardwareErrorCode.NotInitialized }),
      ]);
      rejected.catch(() => undefined);
      let initializing: ReturnType<typeof init> | undefined;
      try {
        if (lifecycle === 'dispose/reinit') {
          const disposing = core.dispose();
          closing.resolve();
          await disposing;
        }
        if (lifecycle === 'initCore') {
          TransportManager.transport = fresh as never;
          DataManager.settings = { ...settings, env: 'desktop-web-ble' };
          core = initCore();
          initConnector();
        } else {
          initializing = init({ ...settings, env: 'desktop-web-ble' }, Fresh);
          if (lifecycle === 'init') {
            closing.resolve();
            await rejected;
          }
          loading.resolve();
          const initialized = await initializing;
          if (!initialized) throw new Error('Core initialization failed');
          core = initialized;
        }
        await switchTransport({
          env: 'emulator',
          Transport: function Current() {
            return current;
          },
        });
        closing.resolve();
        await rejected;
        expect(intermediate).not.toHaveBeenCalled();
        expect(stale).not.toHaveBeenCalled();
        expect(TransportManager.transport).toBe(current);
        expect(DataManager.getSettings('env')).toBe('emulator');
        expect(fresh.stop).toHaveBeenCalledTimes(1);
        expect(current.stop).not.toHaveBeenCalled();
      } finally {
        closing.resolve();
        loading.resolve();
        await initializing;
        await Promise.allSettled([first, second, rejected]);
        await core.dispose();
        TransportManager.transport = previous;
        DataManager.settings = settings;
      }
    }
  );
});
