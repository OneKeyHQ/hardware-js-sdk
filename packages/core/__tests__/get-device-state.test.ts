import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceType } from '@onekeyfe/hd-transport';

import { Device } from '../src/device/Device';
import { DEVICE } from '../src/events';
import { PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE } from '../src/protocols/protocol-v2';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createV2Device = (typedCall: jest.Mock) => {
  const device = Device.fromDescriptor({
    id: 'pro2',
    path: 'pro2',
    protocolType: 'V2',
  } as never);
  (device as any).commands = { typedCall };
  return device;
};

const createV1Device = (typedCall: jest.Mock) => {
  const device = Device.fromDescriptor({
    id: 'pro',
    path: 'pro',
    protocolType: 'V1',
  } as never);
  (device as any).commands = { typedCall };
  return device;
};

const protocolV2ApplicationInfo = {
  version: 1,
  build_fingerprint: 'application__5.0.0__abcdef0__PROD__RELEASE',
  supported_messages: [PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE],
};

const getProtocolV2LoaderInfo = (mode: 'bootloader' | 'romloader') => ({
  version: 1,
  build_fingerprint: `${mode}__1.0.0__abcdef0__PROD__RELEASE`,
  supported_messages: [],
});

describe('getDeviceState', () => {
  test('coalesces concurrent Protocol V2 runtime-context negotiation', async () => {
    let resolveProtocolInfo:
      | ((value: { message: typeof protocolV2ApplicationInfo }) => void)
      | undefined;
    const typedCall = jest.fn(
      () =>
        new Promise<{ message: typeof protocolV2ApplicationInfo }>(resolve => {
          resolveProtocolInfo = resolve;
        })
    );
    const device = createV2Device(typedCall);

    const first = device.ensureProtocolV2RuntimeContext();
    const second = device.ensureProtocolV2RuntimeContext();
    resolveProtocolInfo?.({ message: protocolV2ApplicationInfo });

    await expect(Promise.all([first, second])).resolves.toEqual([
      protocolV2ApplicationInfo,
      protocolV2ApplicationInfo,
    ]);
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
  });

  test('renegotiates Protocol V2 runtime context after transport disconnect', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: protocolV2ApplicationInfo });
    const device = createV2Device(typedCall);

    await device.ensureProtocolV2RuntimeContext();
    await device.ensureProtocolV2RuntimeContext();
    device.markTransportDisconnected();
    await device.ensureProtocolV2RuntimeContext();

    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test('rejects every waiter when runtime-context negotiation is invalidated', async () => {
    let resolveProtocolInfo:
      | ((value: { message: typeof protocolV2ApplicationInfo }) => void)
      | undefined;
    const typedCall = jest.fn(
      () =>
        new Promise<{ message: typeof protocolV2ApplicationInfo }>(resolve => {
          resolveProtocolInfo = resolve;
        })
    );
    const device = createV2Device(typedCall);

    const first = device.ensureProtocolV2RuntimeContext();
    const second = device.ensureProtocolV2RuntimeContext();
    const firstExpectation = expect(first).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInitializeFailed,
    });
    const secondExpectation = expect(second).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceInitializeFailed,
    });
    device.markTransportDisconnected();
    resolveProtocolInfo?.({ message: protocolV2ApplicationInfo });

    await Promise.all([firstExpectation, secondExpectation]);
  });

  test('does not expose the internal wallet session', async () => {
    const device = createV2Device(jest.fn());
    device.updateState({ protocol: 'V2' }, 'initialize');

    const state = await device.getDeviceState();

    expect(state).not.toHaveProperty('session');
  });

  test('hydrates Protocol V2 with separate DeviceInfoGet and DeviceStatusGet', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return {
          message: {
            protocol_version: 2,
            hw: { serial_no: 'SERIAL-1' },
            fw: { application: { version: '5.0.0' } },
          },
        };
      }
      if (requestType === 'ProtocolInfoRequest') {
        return { message: protocolV2ApplicationInfo };
      }
      return { message: { init_states: true, unlocked: true } };
    });
    const device = createV2Device(typedCall);

    const state = await device.getDeviceState();

    expect(state.identity.serialNo).toBe('SERIAL-1');
    expect(typedCall).toHaveBeenCalledTimes(3);
    expect(typedCall.mock.calls[0][0]).toBe('DeviceInfoGet');
    expect(typedCall.mock.calls[0][2]?.targets?.status).not.toBe(true);
    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
  });

  test('uses one full DeviceInfoGet plus DeviceStatusGet when firmware refresh initializes state', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return {
          message: {
            protocol_version: 2,
            hw: { serial_no: 'SERIAL-1' },
            fw: { application: { version: '5.0.0', hash: 'HASH-1' } },
          },
        };
      }
      if (requestType === 'ProtocolInfoRequest') {
        return { message: protocolV2ApplicationInfo };
      }
      return { message: { init_states: true, unlocked: true } };
    });
    const device = createV2Device(typedCall);

    await device.getDeviceState({
      refreshSections: ['identity', 'versions', 'verification'],
    });

    expect(typedCall).toHaveBeenCalledTimes(3);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DeviceInfoGet',
      'DeviceInfo',
      expect.objectContaining({
        types: expect.objectContaining({ hash: true, build_id: true }),
      }),
      expect.anything()
    );
  });

  test('does not overwrite confirmed notInitialized mode during a versions refresh', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        protocol_version: 2,
        hw: { serial_no: 'SERIAL-1' },
        fw: { application: { version: '5.0.0' } },
        se1: { application: { version: '1.0.0' } },
      },
    });
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        status: { mode: 'notInitialized', initialized: false },
      },
      'device-status'
    );

    const state = await device.getDeviceState({ refreshSections: ['versions'] });

    expect(state.status.mode).toBe('notInitialized');
    expect(state.status.initialized).toBe(false);
    expect(state.versions.se01).toBe('1.0.0');
  });

  test.each(['bootloader', 'romloader'] as const)(
    'renegotiates ProtocolInfo to preserve %s mode without DeviceStatusGet',
    async mode => {
      const typedCall = jest.fn().mockImplementation((requestType: string) => {
        if (requestType === 'DeviceInfoGet') {
          return {
            message: {
              hw: { Device_type: DeviceType.PRO2, serial_no: 'SERIAL-1' },
              fw:
                mode === 'romloader'
                  ? { romloader: { version: '1.0.0' } }
                  : { bootloader: { version: '1.0.0' } },
            },
          };
        }
        if (requestType === 'ProtocolInfoRequest') {
          return { message: getProtocolV2LoaderInfo(mode) };
        }
        throw new Error(`Unexpected request: ${requestType}`);
      });
      const device = createV2Device(typedCall);
      device.updateState(
        {
          protocol: 'V2',
          identity: { deviceType: EDeviceType.Pro2 },
          status: { mode },
          raw: { protocolV2ProtocolInfo: getProtocolV2LoaderInfo(mode) },
        },
        'initialize'
      );

      const state = await device.getDeviceState({ refreshSections: ['status'] });

      expect(state.status.mode).toBe(mode);
      expect(typedCall).toHaveBeenCalledTimes(1);
      expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
        eventless_wallet_session: true,
      });
      expect(typedCall).not.toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    }
  );

  test('refreshes Protocol V2 status only when explicitly requested in normal mode', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return {
          message: {
            hw: { serial_no: 'SERIAL-1' },
            fw: { application: { version: '5.0.0' } },
          },
        };
      }
      if (requestType === 'ProtocolInfoRequest') {
        return { message: protocolV2ApplicationInfo };
      }
      return { message: { init_states: true, unlocked: true, device_id: 'device-1' } };
    });
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        status: { mode: 'normal' },
        raw: { protocolV2ProtocolInfo: protocolV2ApplicationInfo },
      },
      'initialize'
    );

    const state = await device.getDeviceState({ refreshSections: ['status'] });

    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(state.status.unlocked).toBe(true);
    expect(state.identity.deviceId).toBe('device-1');
  });

  test('refreshes Protocol V2 settings without requesting status', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        label: 'Renamed Pro 2',
        language: 'ja-JP',
        brightness: 70,
      },
    });
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        status: { mode: 'normal' },
        raw: { protocolV2ProtocolInfo: protocolV2ApplicationInfo },
      },
      'initialize'
    );
    const onState = jest.fn();
    device.on(DEVICE.STATE, onState);

    const state = await device.getDeviceState({ refreshSections: ['settings'] });

    expect(typedCall).toHaveBeenCalledWith('DeviceSettingsGet', 'DeviceSettings', {});
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceStatusGet',
      expect.anything(),
      expect.anything()
    );
    expect(state.identity.label).toBe('Renamed Pro 2');
    expect(state.settings.language).toBe('ja-JP');
    expect(state.settings.brightness).toBe(70);
    expect(onState).toHaveBeenCalledWith(
      device,
      expect.objectContaining({ source: 'settings-read' })
    );
  });

  test('refreshes Protocol V2 status before settings in a combined read', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return {
          message: {
            hw: { serial_no: 'SERIAL-1' },
            fw: { application: { version: '5.0.0' } },
          },
        };
      }
      if (requestType === 'DeviceStatusGet') {
        return {
          message: { init_states: true, unlocked: false, device_id: 'device-1' },
        };
      }
      if (requestType === 'ProtocolInfoRequest') {
        return { message: protocolV2ApplicationInfo };
      }
      if (requestType === 'DeviceSettingsGet') {
        return { message: { label: 'Renamed Pro 2' } };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        status: { mode: 'normal' },
        raw: { protocolV2ProtocolInfo: protocolV2ApplicationInfo },
      },
      'initialize'
    );

    const state = await device.getDeviceState({ refreshSections: ['status', 'settings'] });

    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceStatusGet',
      'DeviceSettingsGet',
    ]);
    expect(state.status.unlocked).toBe(false);
    expect(state.identity.label).toBe('Renamed Pro 2');
  });

  test('keeps the refreshed status when a following settings read fails', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return {
          message: {
            hw: { serial_no: 'SERIAL-1' },
            fw: { application: { version: '5.0.0' } },
          },
        };
      }
      if (requestType === 'DeviceStatusGet') {
        return {
          message: { init_states: true, unlocked: false, device_id: 'device-1' },
        };
      }
      if (requestType === 'ProtocolInfoRequest') {
        return { message: protocolV2ApplicationInfo };
      }
      throw Object.assign(new Error('Device locked'), {
        errorCode: HardwareErrorCode.DeviceLocked,
      });
    });
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        status: { mode: 'normal', unlocked: true },
        raw: { protocolV2ProtocolInfo: protocolV2ApplicationInfo },
      },
      'initialize'
    );

    await expect(
      device.getDeviceState({ refreshSections: ['status', 'settings'] })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceLocked });

    const state = await device.getDeviceState();
    expect(state.status.unlocked).toBe(false);
    expect(state.identity.deviceId).toBe('device-1');
  });

  test('rejects an explicit settings refresh without mutating cached state', async () => {
    const typedCall = jest.fn().mockRejectedValue(
      Object.assign(new Error('Device locked'), {
        errorCode: HardwareErrorCode.DeviceLocked,
      })
    );
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        identity: { label: 'Persisted label' },
        status: { mode: 'normal', unlocked: false },
        settings: { language: 'en-US' },
      },
      'initialize'
    );

    await expect(device.getDeviceState({ refreshSections: ['settings'] })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceLocked,
    });
    const state = await device.getDeviceState();

    expect(state.identity.label).toBe('Persisted label');
    expect(state.settings.language).toBe('en-US');
  });

  test('aggregates OnekeyGetFeatures into a Protocol V1 firmware refresh', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'GetFeatures') {
        return {
          message: {
            onekey_device_type: 'PRO',
            label: 'Pro Wallet',
            initialized: true,
            onekey_firmware_version: '4.10.0',
            onekey_firmware_build_id: 'firmware-build',
          },
        };
      }
      if (requestType === 'OnekeyGetFeatures') {
        return {
          message: {
            onekey_firmware_version: '4.10.1',
            onekey_board_build_id: 'board-build',
            onekey_se01_boot_version: '1.0.0',
            onekey_se01_boot_build_id: 'se-boot-build',
            onekey_se01_boot_hash: 'abcd',
          },
        };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });
    const device = createV1Device(typedCall);

    const state = await device.getDeviceState({
      refreshSections: ['identity', 'versions', 'verification'],
      includeRaw: true,
    });

    expect(typedCall.mock.calls.map(call => call[0])).toEqual(['GetFeatures', 'OnekeyGetFeatures']);
    expect(state.versions.firmware).toBe('4.10.1');
    expect(state.versions.se01Boot).toBe('1.0.0');
    expect(state.verification).toMatchObject({
      firmwareBuildId: 'firmware-build',
      boardBuildId: 'board-build',
      se01BootBuildId: 'se-boot-build',
      se01BootHash: 'abcd',
    });
    expect(state.raw?.protocolV1OneKeyFeatures).toMatchObject({
      onekey_board_build_id: 'board-build',
    });
  });

  test.each([
    EDeviceType.Classic,
    EDeviceType.Classic1s,
    EDeviceType.ClassicPure,
    EDeviceType.Mini,
  ])('keeps the GetFeatures-only firmware path for %s', async deviceType => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        onekey_device_type: deviceType.toUpperCase(),
        initialized: true,
        onekey_firmware_version: '3.5.0',
        se_ver: '1.1.0.2',
      },
    });
    const device = createV1Device(typedCall);

    const state = await device.getDeviceState({
      refreshSections: ['identity', 'versions', 'verification'],
    });

    expect(typedCall.mock.calls.map(call => call[0])).toEqual(['GetFeatures']);
    expect(state.versions).toMatchObject({
      firmware: '3.5.0',
      se: '1.1.0.2',
      se01: '1.1.0.2',
    });
  });

  test('does not clear Protocol V1 firmware details during a later runtime refresh', async () => {
    let getFeaturesCount = 0;
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'GetFeatures') {
        getFeaturesCount += 1;
        return {
          message: {
            onekey_device_type: 'PRO',
            initialized: true,
            unlocked: getFeaturesCount === 1,
            major_version: 4,
            minor_version: 10,
            patch_version: 1,
          },
        };
      }
      if (requestType === 'OnekeyGetFeatures') {
        return {
          message: {
            onekey_se01_boot_version: '1.0.0',
            onekey_se01_boot_build_id: 'se-boot-build',
            onekey_se01_boot_hash: 'abcd',
          },
        };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });
    const device = createV1Device(typedCall);

    await device.getDeviceState({
      refreshSections: ['identity', 'versions', 'verification'],
    });
    const state = await device.getDeviceState({ refreshSections: ['status'] });

    expect(state.status.unlocked).toBe(false);
    expect(state.versions.se01Boot).toBe('1.0.0');
    expect(state.verification).toMatchObject({
      se01BootBuildId: 'se-boot-build',
      se01BootHash: 'abcd',
    });
  });

  test('reloads Protocol V2 DeviceInfo after a physical reconnect', async () => {
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return {
          message: {
            protocol_version: 1,
            hw: { serial_no: 'SERIAL-1' },
            fw: { bootloader: { version: '1.0.0' } },
            se1: {},
          },
        };
      }
      if (requestType === 'ProtocolInfoRequest') {
        return { message: getProtocolV2LoaderInfo('bootloader') };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });
    const device = createV2Device(typedCall);
    device.updateState(
      {
        protocol: 'V2',
        identity: { deviceId: 'wallet-1', serialNo: 'SERIAL-1' },
        status: { mode: 'normal', initialized: true, unlocked: true },
      },
      'initialize'
    );

    device.markTransportDisconnected();
    await device.initialize();

    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      expect.anything(),
      expect.anything()
    );
    expect(device.state?.status.mode).toBe('bootloader');
    expect(device.state?.identity.deviceId).toBeNull();
  });
});
