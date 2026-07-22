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
    expect(typedCall).not.toHaveBeenCalledWith('DeviceStatusGet', expect.anything(), expect.anything());
  });

  test.each(['bootloader', 'romloader'] as const)(
    'does not call DeviceStatusGet in %s mode',
    async mode => {
      const typedCall = jest.fn();
      const device = createV2Device(typedCall);
      device.updateState({ protocol: 'V2', status: { mode } }, 'initialize');

      const state = await device.getDeviceState({ refresh: ['status'] });

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

    const state = await device.getDeviceState({ refresh: ['status'] });

    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(state.status.unlocked).toBe(true);
    expect(state.identity.deviceId).toBe('device-1');
  });
});
