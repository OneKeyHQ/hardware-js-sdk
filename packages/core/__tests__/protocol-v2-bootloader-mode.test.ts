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
  test('does not block Protocol V2 methods in bootloader mode', () => {
    const device = createBootloaderDevice('V2');

    expect(device.hasUnexpectedMode([], [])).toBeNull();
  });

  test('keeps the Protocol V1 bootloader restriction', () => {
    const device = createBootloaderDevice('V1');

    expect(device.hasUnexpectedMode([], [])).toBe(UI_REQUEST.BOOTLOADER);
  });
});
