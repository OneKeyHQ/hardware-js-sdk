import { EDeviceType } from '@onekeyfe/hd-shared';

import DeviceReboot from '../src/api/protocol-v2/DeviceReboot';
import { Device } from '../src/device/Device';
import { UI_REQUEST } from '../src/events/ui-request';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createBootloaderDevice = (protocolType: 'V1' | 'V2') => {
  const device = Device.fromDescriptor({
    id: `${protocolType.toLowerCase()}-bootloader`,
    path: `${protocolType.toLowerCase()}-bootloader`,
    protocolType,
  } as any);

  (device as any).features = {
    bootloaderMode: true,
    initialized: true,
    noBackup: false,
  };

  return device;
};

describe('Pro2 bootloader mode', () => {
  test('allows deviceReboot to return a Protocol V2 bootloader to normal mode', () => {
    const device = createBootloaderDevice('V2');
    const method = new DeviceReboot({
      id: 1,
      payload: { method: 'deviceReboot', rebootType: 'normal' },
    });
    method.init();

    expect(device.hasUnexpectedMode(method.allowDeviceMode, method.requireDeviceMode)).toBeNull();
  });

  test('blocks Protocol V2 methods that are not allowed in bootloader mode', () => {
    const device = createBootloaderDevice('V2');

    expect(device.hasUnexpectedMode([], [])).toBe(UI_REQUEST.BOOTLOADER);
  });

  test('allows Protocol V2 methods that explicitly support bootloader mode', () => {
    const device = createBootloaderDevice('V2');

    expect(device.hasUnexpectedMode([UI_REQUEST.BOOTLOADER], [])).toBeNull();
  });

  test.each([EDeviceType.Pro2, EDeviceType.Neo])(
    'blocks unsupported Protocol V2 methods in %s romloader mode',
    deviceType => {
      const device = createBootloaderDevice('V2');
      device.updateState(
        {
          protocol: 'V2',
          identity: { deviceType },
          status: { mode: 'romloader', initialized: null },
        },
        'initialize'
      );

      expect(device.hasUnexpectedMode([], [])).toBe(UI_REQUEST.BOOTLOADER);
      expect(device.hasUnexpectedMode([UI_REQUEST.NOT_INITIALIZE], [])).toBe(UI_REQUEST.BOOTLOADER);
      expect(
        device.hasUnexpectedMode([UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE], [])
      ).toBeNull();
    }
  );

  test('keeps the Protocol V1 bootloader restriction', () => {
    const device = createBootloaderDevice('V1');

    expect(device.hasUnexpectedMode([], [])).toBe(UI_REQUEST.BOOTLOADER);
  });
});
