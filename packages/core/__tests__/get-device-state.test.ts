import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { Device } from '../src/device/Device';

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

describe('getDeviceState', () => {
  test('hydrates Protocol V2 without status target or DeviceStatusGet by default', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        protocol_version: 2,
        hw: { serial_no: 'SERIAL-1' },
        fw: { application: { version: '5.0.0' } },
      },
    });
    const device = createV2Device(typedCall);

    const state = await device.getDeviceState();

    expect(state.identity.serialNo).toBe('SERIAL-1');
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls[0][0]).toBe('DeviceInfoGet');
    expect(typedCall.mock.calls[0][2]?.targets?.status).not.toBe(true);
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceStatusGet',
      expect.anything(),
      expect.anything()
    );
  });

  test('uses a single full DeviceInfoGet when firmware refresh initializes the state', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        protocol_version: 2,
        hw: { serial_no: 'SERIAL-1' },
        fw: { application: { version: '5.0.0', hash: 'HASH-1' } },
      },
    });
    const device = createV2Device(typedCall);

    await device.getDeviceState({
      refreshSections: ['identity', 'versions', 'verification'],
    });

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      expect.objectContaining({
        types: expect.objectContaining({ hash: true, build_id: true }),
      }),
      expect.anything()
    );
  });

  test.each(['bootloader', 'romloader'] as const)(
    'does not call DeviceStatusGet in %s mode',
    async mode => {
      const typedCall = jest.fn();
      const device = createV2Device(typedCall);
      device.updateState({ protocol: 'V2', status: { mode } }, 'initialize');

      const state = await device.getDeviceState({ refreshSections: ['status'] });

      expect(state.status.mode).toBe(mode);
      expect(typedCall).not.toHaveBeenCalled();
    }
  );

  test('refreshes Protocol V2 status only when explicitly requested in normal mode', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: { init_states: true, unlocked: true, device_id: 'device-1' },
    });
    const device = createV2Device(typedCall);
    device.updateState({ protocol: 'V2', status: { mode: 'normal' } }, 'initialize');

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
    device.updateState({ protocol: 'V2', status: { mode: 'normal' } }, 'initialize');

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
});
