import JSZip from 'jszip';

import FirmwareUpdateV3 from '../src/api/FirmwareUpdateV3';
import { getProtocolV2Features, normalizeProtocolV2Features } from '../src/protocols/protocol-v2';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const descriptor = {
  id: 'ble-id',
  path: 'usb-path',
};

describe('Protocol V2 feature adapter', () => {
  test('normalizes Protocol V2 DeviceInfo into existing Features fields', () => {
    const features = normalizeProtocolV2Features(descriptor as any, {
      hw: {
        serial_no: 'PR2SERIAL',
      },
      fw: {
        board: {
          version: '0.1.0',
          hash: [1, 2, 255],
        },
        boot: {
          version: '0.2.0',
          build_id: 'boot-build',
          hash: new Uint8Array([10, 11]),
        },
        app: {
          version: '1.2.3',
          build_id: 'app-build',
          hash: 'abc123',
        },
      },
      bt: {
        app: {
          version: '4.5.6',
          build_id: 'bt-build',
          hash: [12, 13],
        },
        adv_name: 'Pro2 BLE',
      },
      se1: {
        app: {
          version: '7.8.9',
          build_id: 'se-build',
          hash: [14, 15],
        },
        state: 85,
      },
      se2: {
        app: {
          version: '8.0.0',
        },
        state: 0,
      },
      status: {
        label: 'My Pro2',
        language: 'en-US',
        bt_enable: true,
        init_states: false,
        backup_required: true,
        passphrase_protection: true,
      },
    });

    expect(features.device_id).toBe('PR2SERIAL');
    expect(features.serial_no).toBe('PR2SERIAL');
    expect(features.onekey_serial_no).toBe('PR2SERIAL');
    expect(features.onekey_device_type).toBe('pro2');
    expect(features.major_version).toBe(1);
    expect(features.minor_version).toBe(2);
    expect(features.patch_version).toBe(3);
    expect(features.onekey_firmware_version).toBe('1.2.3');
    expect(features.onekey_firmware_build_id).toBe('app-build');
    expect(features.onekey_firmware_hash).toBe('abc123');
    expect(features.bootloader_version).toBe('0.2.0');
    expect(features.onekey_boot_build_id).toBe('boot-build');
    expect(features.onekey_boot_hash).toBe('0a0b');
    expect(features.onekey_board_hash).toBe('0102ff');
    expect(features.ble_name).toBe('Pro2 BLE');
    expect(features.onekey_ble_version).toBe('4.5.6');
    expect(features.onekey_ble_hash).toBe('0c0d');
    expect(features.onekey_se01_version).toBe('7.8.9');
    expect(features.onekey_se01_hash).toBe('0e0f');
    expect(features.onekey_se01_state).toBe('APP');
    expect(features.onekey_se02_state).toBe('BOOT');
    expect(features.label).toBe('My Pro2');
    expect(features.language).toBe('en-US');
    expect(features.initialized).toBe(false);
    expect(features.needs_backup).toBe(true);
    expect(features.passphrase_protection).toBe(true);
    expect(features.ble_enable).toBe(true);
  });

  test('falls back to descriptor id when DevGetDeviceInfo is unavailable', async () => {
    const onDeviceInfoError = jest.fn();
    const commands = {
      typedCall: jest
        .fn()
        .mockResolvedValueOnce({ type: 'Success', message: { message: 'pong' } })
        .mockRejectedValueOnce(new Error('unsupported')),
    };

    const features = await getProtocolV2Features({
      commands: commands as any,
      descriptor: descriptor as any,
      onDeviceInfoError,
    });

    expect(commands.typedCall).toHaveBeenNthCalledWith(1, 'Ping', 'Success', { message: 'init' });
    expect(commands.typedCall).toHaveBeenNthCalledWith(
      2,
      'DevGetDeviceInfo',
      'DeviceInfo',
      expect.objectContaining({
        targets: expect.objectContaining({
          hw: true,
          fw: true,
          bt: true,
          status: true,
        }),
      })
    );
    expect(onDeviceInfoError).toHaveBeenCalledTimes(1);
    expect(features.device_id).toBe('usb-path');
    expect(features.serial_no).toBe('usb-path');
    expect(features.onekey_serial_no).toBe('usb-path');
  });
});

describe('Protocol V2 firmware update targets', () => {
  test('passes resource, bootloader, BLE, SE and app files to DevFirmwareUpdate targets', async () => {
    const resourceZip = new JSZip();
    resourceZip.file('icons/home.png', new Uint8Array([1, 2, 3]));
    const resourceBinary = await resourceZip.generateAsync({ type: 'arraybuffer' });
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
      },
    });

    const writtenPaths: string[] = [];
    method.postTipMessage = jest.fn();
    (method as any).protocolV2CreateFolder = jest.fn().mockResolvedValue(undefined);
    (method as any).protocolV2CommonUpdateProcess = jest.fn().mockImplementation(params => {
      writtenPaths.push(params.filePath);
      return Number(params.processedSize ?? 0) + Number(params.payload.byteLength);
    });
    (method as any).protocolV2StartFirmwareUpdate = jest.fn().mockResolvedValue(undefined);

    await (method as any).executeProtocolV2Update({
      resourceBinary,
      bootloaderBinary: new Uint8Array([4, 5]).buffer,
      fwBinaryMap: [
        {
          fileName: 'ble-firmware.bin',
          binary: new Uint8Array([6]).buffer,
        },
        {
          fileName: 'se1-firmware.bin',
          binary: new Uint8Array([7]).buffer,
        },
        {
          fileName: 'firmware.bin',
          binary: new Uint8Array([8]).buffer,
        },
      ],
    });

    expect((method as any).protocolV2CreateFolder).toHaveBeenCalledWith('vol1:res/');
    expect(writtenPaths).toEqual([
      'vol1:res/home.png',
      'vol1:bootloader.bin',
      'vol1:ble-firmware.bin',
      'vol1:se1-firmware.bin',
      'vol1:firmware.bin',
    ]);
    expect((method as any).protocolV2StartFirmwareUpdate).toHaveBeenCalledWith({
      targets: [
        { target_id: 10, path: 'vol1:res/' },
        { target_id: 1, path: 'vol1:bootloader.bin' },
        { target_id: 2, path: 'vol1:ble-firmware.bin' },
        { target_id: 3, path: 'vol1:se1-firmware.bin' },
        { target_id: 0, path: 'vol1:firmware.bin' },
      ],
    });
  });
});
