import { getLegacyFirmwareConnectTimeout, program } from '../cli';

describe('firmware-update-legacy CLI command', () => {
  test('提供 Classic/Pure 的本地固件升级命令', () => {
    const command = program.commands.find(item => item.name() === 'firmware-update-legacy');

    expect(command).toBeDefined();
    expect(command?.description()).toBe(
      'Update Classic/Pure firmware through the legacy protocol'
    );
    expect(command?.options.find(option => option.long === '--binary')?.mandatory).toBe(true);
    expect(command?.options.some(option => option.long === '--device-name')).toBe(true);
    expect(command?.options.some(option => option.long === '--update-type')).toBe(true);
  });

  test('USB Classic 固件升级使用足够的设备探测超时', () => {
    expect(getLegacyFirmwareConnectTimeout('usb')).toBe(90_000);
    expect(getLegacyFirmwareConnectTimeout('ble')).toBeUndefined();
  });
});
