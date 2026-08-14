import { EDeviceType } from '@onekeyfe/hd-shared';

import FirmwareUpdate from '../../src/api/FirmwareUpdate';
import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import { BOOTLOADER_POLL_INITIALIZE_TIMEOUT_MS } from '../../src/api/firmware/FirmwareUpdateBaseMethod';
import { DataManager } from '../../src/data-manager';
import { DevicePool } from '../../src/device/DevicePool';

import type { Device } from '../../src/device/Device';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const BLE_ID = 'ble-device';
const WEBUSB_ID = 'webusb-device';

const flush = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

describe.each([
  [
    'FirmwareUpdateV2',
    () =>
      new FirmwareUpdateV2({
        id: 1,
        payload: { method: 'firmwareUpdateV2', connectId: BLE_ID },
      }),
  ],
  [
    'FirmwareUpdateV3 (base method)',
    () =>
      new FirmwareUpdateV3({
        id: 1,
        payload: { method: 'firmwareUpdateV3', connectId: BLE_ID },
      }),
  ],
  [
    'FirmwareUpdate (legacy)',
    () =>
      new FirmwareUpdate({
        id: 1,
        payload: { method: 'firmwareUpdate', connectId: BLE_ID },
      }),
  ],
])('%s BLE bootloader reboot polling', (_name, buildMethod) => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  test('probes serially with a short timeout and survives a slow reboot', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(true);

    const method = buildMethod();

    let deviceBack = false;
    let inFlight = 0;
    let maxInFlight = 0;
    const probeTimeouts: Array<number | undefined> = [];

    const initialize = jest.fn((options?: { timeoutMs?: number }) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      probeTimeouts.push(options?.timeoutMs);
      return new Promise<void>((resolve, reject) => {
        if (deviceBack) {
          inFlight -= 1;
          resolve();
          return;
        }
        if (options?.timeoutMs) {
          setTimeout(() => {
            inFlight -= 1;
            reject(Object.assign(new Error('BLE response timeout'), { errorCode: 713 }));
          }, options.timeoutMs);
        }
        // Without a per-probe timeout this promise never settles, matching a device
        // that never received the request while rebooting.
      });
    });

    method.device = {
      originalDescriptor: { id: BLE_ID },
      deviceConnector: { acquire: jest.fn(() => Promise.resolve()) },
      initialize,
      isBootloader: jest.fn(() => deviceBack),
      getCurrentDeviceType: jest.fn(() => 'classic1s'),
    } as unknown as Device;

    // The device re-enumerates in bootloader mode 7 seconds after "reboot start".
    setTimeout(() => {
      deviceBack = true;
    }, 7000);

    method.checkDeviceToBootloader(BLE_ID);
    const resolved = jest.fn();
    method.checkPromise?.promise.then(resolved);

    for (let elapsed = 0; elapsed < 15000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
      if (resolved.mock.calls.length) break;
    }

    // Must detect bootloader mode well inside the 30s reboot budget.
    expect(resolved).toHaveBeenCalledWith(true);
    expect(initialize).toHaveBeenCalled();
    // Probes must never overlap: an unanswered Initialize left in flight is what
    // the transport later times out and used to tear the connection down with.
    expect(maxInFlight).toBe(1);
    // Every probe must carry the bounded poll timeout so a silent device frees the
    // slot promptly; the 30s reboot budget must fit several attempts.
    expect(BOOTLOADER_POLL_INITIALIZE_TIMEOUT_MS).toBeLessThanOrEqual(10000);
    for (const timeoutMs of probeTimeouts) {
      expect(timeoutMs).toBe(BOOTLOADER_POLL_INITIALIZE_TIMEOUT_MS);
    }
  });

  test('skips ticks while a probe hangs in acquire', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native' as never);
    jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(true);

    const method = buildMethod();

    let deviceBack = false;
    let activeProbes = 0;
    let maxActiveProbes = 0;

    // The first acquire hangs for 7s (BLE reconnect while the device reboots);
    // later acquires resolve immediately.
    let acquireCalls = 0;
    const acquire = jest.fn(() => {
      activeProbes += 1;
      maxActiveProbes = Math.max(maxActiveProbes, activeProbes);
      acquireCalls += 1;
      if (acquireCalls === 1) {
        return new Promise<void>(resolve => {
          setTimeout(resolve, 7000);
        });
      }
      return Promise.resolve();
    });

    const initialize = jest.fn(
      (options?: { timeoutMs?: number }) =>
        new Promise<void>((resolve, reject) => {
          if (deviceBack) {
            activeProbes -= 1;
            resolve();
            return;
          }
          if (options?.timeoutMs) {
            setTimeout(() => {
              activeProbes -= 1;
              reject(Object.assign(new Error('BLE response timeout'), { errorCode: 713 }));
            }, options.timeoutMs);
          }
        })
    );

    method.device = {
      originalDescriptor: { id: BLE_ID },
      deviceConnector: { acquire },
      initialize,
      isBootloader: jest.fn(() => deviceBack),
      getCurrentDeviceType: jest.fn(() => 'classic1s'),
    } as unknown as Device;

    setTimeout(() => {
      deviceBack = true;
    }, 7000);

    method.checkDeviceToBootloader(BLE_ID);
    const resolved = jest.fn();
    method.checkPromise?.promise.then(resolved);

    for (let elapsed = 0; elapsed < 15000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
      if (resolved.mock.calls.length) break;
    }

    expect(resolved).toHaveBeenCalledWith(true);
    // While the first probe hangs inside acquire, interval ticks must be skipped —
    // overlapping probes are the exact mechanism from the incident.
    expect(maxActiveProbes).toBe(1);
  });
});

describe('FirmwareUpdateV2 WebUSB bootloader polling', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('skips interval ticks while a bootloader probe is in flight and resumes afterward', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('desktop' as never);
    jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(false);
    jest.spyOn(DataManager, 'isBrowserWebUsb').mockReturnValue(false);

    const method = new FirmwareUpdateV2({
      id: 1,
      payload: { method: 'firmwareUpdateV2', connectId: WEBUSB_ID },
    });

    let inFlight = 0;
    let maxInFlight = 0;
    const resolveProbes: Array<(found: boolean) => void> = [];
    const probe = jest.spyOn(method as any, '_checkDeviceInBootloaderMode').mockImplementation(
      () =>
        new Promise<boolean>(resolve => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          resolveProbes.push(found => {
            inFlight -= 1;
            resolve(found);
          });
        })
    );

    method.device = {
      getCurrentDeviceType: jest.fn(() => EDeviceType.Classic),
    } as unknown as Device;

    method.checkDeviceToBootloader(WEBUSB_ID);

    for (let elapsed = 0; elapsed < 6500; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }

    expect(probe).toHaveBeenCalled();
    expect(maxInFlight).toBe(1);

    resolveProbes[0]?.(false);
    await flush();
    jest.advanceTimersByTime(2000);
    await flush();

    expect(probe).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);
    resolveProbes[1]?.(false);
    await flush();
  });
});

describe.each([
  [
    'FirmwareUpdateV2',
    () =>
      new FirmwareUpdateV2({
        id: 1,
        payload: { method: 'firmwareUpdateV2', connectId: WEBUSB_ID },
      }),
  ],
  [
    'FirmwareUpdateV3 (base method)',
    () =>
      new FirmwareUpdateV3({
        id: 1,
        payload: { method: 'firmwareUpdateV3', connectId: WEBUSB_ID },
      }),
  ],
])('%s WebUSB bootloader authorization', (_name, buildMethod) => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('resumes bounded polling after browser authorization returns an empty enumeration', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('webusb' as never);
    jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(false);
    jest.spyOn(DataManager, 'isBrowserWebUsb').mockReturnValue(true);

    const method = buildMethod();
    let permissionGranted = false;
    const bootloaderDevice = {
      isBootloader: jest.fn(() => true),
    } as unknown as Device;
    jest.spyOn(DevicePool, 'getDevices').mockImplementation(() =>
      Promise.resolve({
        devices: {},
        deviceList: permissionGranted ? [bootloaderDevice] : [],
      })
    );

    const commands = { disposed: true };
    const updateFromCache = jest.fn();
    method.device = {
      originalDescriptor: {
        id: WEBUSB_ID,
        path: WEBUSB_ID,
        protocolType: 'V1',
      },
      deviceConnector: {
        enumerate: jest.fn(() =>
          Promise.resolve({
            descriptors: permissionGranted ? [{ path: 'bootloader-device' }] : [],
          })
        ),
      },
      commands,
      updateFromCache,
      getCurrentDeviceType: jest.fn(() => EDeviceType.Pro),
    } as unknown as Device;
    method.postTipMessage = jest.fn();

    let resolvePrompt: (deviceId: string) => void = () => undefined;
    const promptPromise = new Promise<string>(resolve => {
      resolvePrompt = resolve;
    });
    const prompt = jest
      .spyOn(method as any, '_promptDeviceInBootloaderForWebDevice')
      .mockReturnValue(promptPromise);

    method.checkDeviceToBootloader(WEBUSB_ID);
    const resolved = jest.fn();
    const rejected = jest.fn();
    method.checkPromise?.promise.then(resolved, rejected);

    for (let elapsed = 0; elapsed < 15000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
      if (prompt.mock.calls.length) break;
    }

    expect(prompt).toHaveBeenCalledTimes(1);

    // Browser permission depends on a user gesture and must not consume the
    // automatic reboot detection deadline.
    for (let elapsed = 0; elapsed < 35000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    expect(rejected).not.toHaveBeenCalled();

    resolvePrompt('bootloader-device');
    await flush();
    await flush();

    // The chooser may resolve before the newly authorized device appears in the
    // next WebUSB enumeration. That transient empty result must not strand the
    // deferred check after its original interval and timeout were cleared.
    expect(resolved).not.toHaveBeenCalled();
    expect(rejected).not.toHaveBeenCalled();

    permissionGranted = true;
    for (let elapsed = 0; elapsed < 5000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
      if (resolved.mock.calls.length) break;
    }

    expect(resolved).toHaveBeenCalledWith(true);
    expect(updateFromCache).toHaveBeenCalledWith(bootloaderDevice);
    expect(commands.disposed).toBe(false);
  });

  test('rejects after the fresh deadline when the authorized device never appears', async () => {
    jest.spyOn(DataManager, 'getSettings').mockReturnValue('webusb' as never);
    jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(false);
    jest.spyOn(DataManager, 'isBrowserWebUsb').mockReturnValue(true);
    jest.spyOn(DevicePool, 'getDevices').mockResolvedValue({ devices: {}, deviceList: [] });

    const method = buildMethod();
    method.device = {
      originalDescriptor: {
        id: WEBUSB_ID,
        path: WEBUSB_ID,
        protocolType: 'V1',
      },
      deviceConnector: {
        enumerate: jest.fn().mockResolvedValue({ descriptors: [] }),
      },
      commands: { disposed: true },
      updateFromCache: jest.fn(),
      getCurrentDeviceType: jest.fn(() => EDeviceType.Pro),
    } as unknown as Device;
    method.postTipMessage = jest.fn();
    const prompt = jest
      .spyOn(method as any, '_promptDeviceInBootloaderForWebDevice')
      .mockResolvedValue('bootloader-device');

    method.checkDeviceToBootloader(WEBUSB_ID);
    const resolved = jest.fn();
    const rejected = jest.fn();
    method.checkPromise?.promise.then(resolved, rejected);

    for (let elapsed = 0; elapsed < 15000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
      if (prompt.mock.calls.length) break;
    }
    expect(prompt).toHaveBeenCalledTimes(1);

    for (let elapsed = 0; elapsed < 31000; elapsed += 500) {
      jest.advanceTimersByTime(500);
      // eslint-disable-next-line no-await-in-loop
      await flush();
      if (rejected.mock.calls.length) break;
    }

    expect(resolved).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledTimes(1);
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
