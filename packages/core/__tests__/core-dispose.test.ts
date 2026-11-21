import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';

import Core, { init, initConnector, initCore, switchTransport } from '../src/core';
import DataManager from '../src/data-manager/DataManager';
import TransportManager from '../src/data-manager/TransportManager';
import { Device } from '../src/device/Device';
import { DevicePool } from '../src/device/DevicePool';
import { IFRAME, UI_EVENT, UI_RESPONSE } from '../src/events';

import type { CoreContext } from '../src/core';
import type { UiPromiseResponse } from '../src/events/ui-promise';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

describe('Core.dispose', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('a superseded Core cannot handle responses or dispose the current runtime', async () => {
    const previous = TransportManager.transport;
    const stop = jest.fn().mockResolvedValue(undefined);
    const old = initCore();
    const current = initCore();
    TransportManager.transport = { stop } as never;
    const disposePool = jest.spyOn(DevicePool, 'dispose');
    try {
      await expect(
        old.handleMessage({ event: UI_EVENT, type: UI_RESPONSE.RECEIVE_PIN, payload: '' })
      ).rejects.toMatchObject({ errorCode: HardwareErrorCode.NotInitialized });
      await old.dispose();
      expect(stop).not.toHaveBeenCalled();
      expect(disposePool).not.toHaveBeenCalled();
      await current.dispose();
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      await current.dispose();
      TransportManager.transport = previous;
    }
  });

  test('disposes old PIN waiters while a new Core can accept its own reply', async () => {
    const getWaiters = (core: Core) =>
      (core as unknown as { getCoreContext: () => CoreContext }).getCoreContext().uiPromises;
    const old = initCore();
    const oldWaiter = createDeferred<UiPromiseResponse, typeof UI_RESPONSE.RECEIVE_PIN>(
      UI_RESPONSE.RECEIVE_PIN
    );
    getWaiters(old).push(oldWaiter);
    const rejected = expect(oldWaiter.promise).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });
    const current = initCore();
    const currentWaiter = createDeferred<UiPromiseResponse, typeof UI_RESPONSE.RECEIVE_PIN>(
      UI_RESPONSE.RECEIVE_PIN
    );
    getWaiters(current).push(currentWaiter);
    const reply = { event: UI_EVENT, type: UI_RESPONSE.RECEIVE_PIN, payload: '' } as const;
    try {
      await old.dispose();
      await rejected;
      await current.handleMessage(reply);
      await expect(currentWaiter.promise).resolves.toBe(reply);
    } finally {
      await current.dispose();
    }
  });

  test('a pending transport load cannot stop the transport of a new Core', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const old = initCore();
    const entered = createDeferred<void>();
    const loading = createDeferred<new () => unknown>();
    const stale = jest.fn(() => ({ stop: jest.fn() }));
    const fresh = { stop: jest.fn() };
    const loadNext = jest.fn().mockResolvedValue(stale);
    let current: Core | undefined;
    const switching = switchTransport({
      env: 'node-usb',
      owner: old,
      loadTransport: () => {
        entered.resolve();
        return loading.promise;
      },
    });
    const queued = switchTransport({ env: 'webusb', owner: old, loadTransport: loadNext });
    const rejections = Promise.all(
      [switching, queued].map(promise =>
        expect(promise).rejects.toMatchObject({ errorCode: HardwareErrorCode.NotInitialized })
      )
    );
    try {
      await entered.promise;
      expect(loadNext).not.toHaveBeenCalled();
      await old.dispose();
      current = initCore();
      TransportManager.transport = fresh as never;
      loading.resolve(stale);
      await rejections;
      expect(stale).not.toHaveBeenCalled();
      expect(loadNext).not.toHaveBeenCalled();
      expect(fresh.stop).not.toHaveBeenCalled();
    } finally {
      loading.resolve(stale);
      await Promise.allSettled([switching, queued, rejections]);
      await old.dispose();
      await current?.dispose();
      TransportManager.transport = previous;
      DataManager.settings = settings;
    }
  });

  test('rejects lowlevel without a plugin before stopping the active transport', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const stop = jest.fn();
    TransportManager.transport = { stop } as never;
    const core = initCore();
    const loadTransport = jest.fn();
    try {
      await expect(
        switchTransport({ env: 'lowlevel', owner: core, loadTransport })
      ).rejects.toMatchObject({ errorCode: HardwareErrorCode.TransportNotConfigured });
      expect(stop).not.toHaveBeenCalled();
      expect(loadTransport).not.toHaveBeenCalled();
      expect(DataManager.settings).toBe(settings);
    } finally {
      await core.dispose();
      TransportManager.transport = previous;
      DataManager.settings = settings;
    }
  });

  test('clears the previous plugin when a new lifecycle supplies none', async () => {
    const previous = TransportManager.transport;
    const previousPlugin = TransportManager.plugin;
    const { settings } = DataManager;
    const plugin = {
      enumerate: jest.fn(),
      send: jest.fn(),
      receive: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      init: jest.fn(),
      version: 'test',
    };
    function TestTransport() {
      return { stop: jest.fn() };
    }
    jest.spyOn(DataManager, 'load').mockImplementation(next => {
      DataManager.settings = next;
      return Promise.resolve();
    });
    const old = await init({ ...settings, env: 'lowlevel' }, TestTransport, plugin);
    let current: Core | undefined;
    try {
      expect(TransportManager.plugin).toBe(plugin);
      current = await init({ ...settings, env: 'webusb' }, TestTransport);
      expect(TransportManager.plugin).toBeNull();
      await switchTransport({ env: 'lowlevel', Transport: TestTransport, plugin });
      expect(TransportManager.plugin).toBe(plugin);
      await old?.dispose();
      expect(TransportManager.plugin).toBe(plugin);
      await current?.dispose();
      expect(TransportManager.plugin).toBeNull();
    } finally {
      await old?.dispose();
      await current?.dispose();
      TransportManager.transport = previous;
      TransportManager.plugin = previousPlugin;
      DataManager.settings = settings;
    }
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

  test('switchTransport invalidates cached BLE devices so calls bind to the new transport', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const transportA = {
      name: 'TransportA',
      init: jest.fn(),
      configure: jest.fn(),
      configureProtocolV2: jest.fn(),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const transportB = {
      name: 'TransportB',
      init: jest.fn(),
      configure: jest.fn(),
      configureProtocolV2: jest.fn(),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const seenDevices: Device[] = [];
    const fromDescriptorSpy = jest.spyOn(Device, 'fromDescriptor').mockImplementation((...args) => {
      const device = new Device(...args);
      seenDevices.push(device);
      return device;
    });
    jest
      .spyOn(Device.prototype, 'acquire')
      .mockRejectedValue(ERRORS.TypedError(HardwareErrorCode.BleUnavailableWhileUsbConnected));
    jest.spyOn(TransportManager, 'configure').mockResolvedValue(undefined);
    jest.spyOn(DataManager, 'load').mockImplementation(next => {
      DataManager.settings = next;
      return Promise.resolve();
    });

    function TransportA() {
      return transportA;
    }
    const core = await init({ ...settings, env: 'desktop-web-ble' }, TransportA);
    if (!core) throw new Error('Core initialization failed');

    try {
      await core.handleMessage({
        id: 1,
        event: IFRAME.CALL,
        type: IFRAME.CALL,
        payload: { method: 'getFeatures', connectId: 'ble-device-1' },
      });
      expect(fromDescriptorSpy).toHaveBeenCalledTimes(1);

      await switchTransport({
        env: 'desktop-web-ble',
        Transport: function TransportB() {
          return transportB;
        },
      });
      expect(transportA.stop).toHaveBeenCalledTimes(1);

      await core.handleMessage({
        id: 2,
        event: IFRAME.CALL,
        type: IFRAME.CALL,
        payload: { method: 'getFeatures', connectId: 'ble-device-1' },
      });
      expect(fromDescriptorSpy).toHaveBeenCalledTimes(2);
      expect(seenDevices).toHaveLength(2);
      expect(seenDevices[0]).not.toBe(seenDevices[1]);
      expect(seenDevices[0].deviceConnector).not.toBe(seenDevices[1].deviceConnector);
      expect(TransportManager.getTransport()).toBe(transportB);
    } finally {
      await core.dispose();
      TransportManager.transport = previous;
      DataManager.settings = settings;
    }
  });

  test('switchTransport resets webUsbInit and reactNativeInit so replacement transports initialize', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const transportA = {
      name: 'WebUsbA',
      init: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const transportB = {
      name: 'WebUsbB',
      init: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    function WebUsbA() {
      return transportA;
    }
    function WebUsbB() {
      return transportB;
    }
    jest.spyOn(DataManager, 'load').mockImplementation(next => {
      DataManager.settings = next;
      return Promise.resolve();
    });

    const core = await init({ ...settings, env: 'webusb' }, WebUsbA);
    if (!core) throw new Error('Core initialization failed');

    try {
      await TransportManager.ensureInitialized();
      expect(transportA.init).toHaveBeenCalledTimes(1);
      expect(TransportManager.webUsbInit).toBe(true);

      await switchTransport({ env: 'webusb', Transport: WebUsbB });
      expect(TransportManager.webUsbInit).toBe(false);
      expect(TransportManager.reactNativeInit).toBe(false);

      await TransportManager.ensureInitialized();
      expect(transportB.init).toHaveBeenCalledTimes(1);
    } finally {
      await core.dispose();
      TransportManager.transport = previous;
      DataManager.settings = settings;
    }
  });

  test('switchTransport validates nextTransport before stopping and cancels active UI waiters', async () => {
    const previous = TransportManager.transport;
    const { settings } = DataManager;
    const activeOld = {
      name: 'ActiveOld',
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const next = {
      name: 'NextTransport',
      stop: jest.fn().mockResolvedValue(undefined),
    };
    function NextTransport() {
      return next;
    }
    TransportManager.transport = activeOld as never;
    DataManager.settings = { ...settings, env: 'webusb' };
    const core = initCore();
    initConnector();
    const waiter = createDeferred<UiPromiseResponse, typeof UI_RESPONSE.RECEIVE_PIN>(
      UI_RESPONSE.RECEIVE_PIN
    );
    (core as unknown as { getCoreContext: () => CoreContext })
      .getCoreContext()
      .uiPromises.push(waiter);
    const waiterRejected = expect(waiter.promise).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });

    try {
      // Invalid nextTransport must fail before stopping the active transport.
      await expect(
        switchTransport({ env: 'emulator', Transport: null as never })
      ).rejects.toMatchObject({ errorCode: HardwareErrorCode.TransportNotConfigured });
      expect(activeOld.stop).not.toHaveBeenCalled();

      await switchTransport({ env: 'emulator', Transport: NextTransport });
      await waiterRejected;
      expect(activeOld.stop).toHaveBeenCalledTimes(1);
      expect(TransportManager.transport).toBe(next);
      expect(DataManager.getSettings('env')).toBe('emulator');
    } finally {
      await core.dispose();
      TransportManager.transport = previous;
      DataManager.settings = settings;
    }
  });
});
