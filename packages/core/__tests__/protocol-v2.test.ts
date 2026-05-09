import JSZip from 'jszip';

import FileRead from '../src/api/FileRead';
import FileWrite from '../src/api/FileWrite';
import DevFirmwareUpdate from '../src/api/protocol-v2/DevFirmwareUpdate';
import FirmwareUpdateV3 from '../src/api/FirmwareUpdateV3';
import FirmwareUpdateV4 from '../src/api/FirmwareUpdateV4';
import GetOnekeyFeatures from '../src/api/GetOnekeyFeatures';
import { UI_REQUEST } from '../src/events/ui-request';
import { getProtocolV2Features, normalizeProtocolV2Features } from '../src/protocols/protocol-v2';

import type { DeviceCommands } from '../src/device/DeviceCommands';

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

  test('marks fallback features as unavailable when DeviceInfo is missing', () => {
    const features = normalizeProtocolV2Features(descriptor as any);

    expect(features.device_id).toBe('usb-path');
    expect(features.serial_no).toBe('usb-path');
    expect(features.onekey_serial_no).toBe('usb-path');
    expect(features.initialized).toBe(false);
    expect(features.unlocked).toBe(false);
    expect(features.firmware_present).toBe(false);
  });

  test('throws when DevGetDeviceInfo is unavailable', async () => {
    const onDeviceInfoError = jest.fn();
    const commands = {
      typedCall: jest
        .fn()
        .mockResolvedValueOnce({ type: 'Success', message: { message: 'pong' } })
        .mockRejectedValueOnce(new Error('unsupported')),
    };

    await expect(
      getProtocolV2Features({
        commands: commands as unknown as DeviceCommands,
        descriptor: descriptor as any,
        onDeviceInfoError,
      })
    ).rejects.toThrow('unsupported');

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
  });

  test('returns Protocol V2 oneKey fields without calling legacy OnekeyGetFeatures', async () => {
    const method = new GetOnekeyFeatures({
      id: 1,
      payload: {
        method: 'getOnekeyFeatures',
      },
    });
    const typedCall = jest.fn();

    (method as any).device = {
      originalDescriptor: { protocolType: 'V2' },
      commands: { typedCall },
      features: {
        label: 'ignored label',
        onekey_device_type: 'pro2',
        onekey_firmware_version: '1.2.3',
        onekey_firmware_build_id: 'app-build',
        onekey_serial_no: 'PR2SERIAL',
        onekey_ble_name: 'Pro2 BLE',
      },
    };

    const message = await method.run();

    expect(typedCall).not.toHaveBeenCalled();
    expect(message).toMatchObject({
      onekey_device_type: 'pro2',
      onekey_firmware_version: '1.2.3',
      onekey_firmware_build_id: 'app-build',
      onekey_serial_no: 'PR2SERIAL',
      onekey_ble_name: 'Pro2 BLE',
    });
    expect(message).not.toHaveProperty('label');
  });
});

describe('Protocol V2 firmware update targets', () => {
  test('keeps Protocol V2 firmware updates off the legacy firmwareUpdateV3 path', async () => {
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
      },
    });
    (method as any).device = {
      originalDescriptor: { protocolType: 'V2' },
    };

    await expect(method.run()).rejects.toThrow('firmwareUpdateV4');
  });

  test('uses Protocol V2 features after BLE final reconnect without legacy Initialize', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-session' });
    const typedCall = jest.fn().mockImplementation((name: string) => {
      if (name === 'Ping') {
        return Promise.resolve({ type: 'Success', message: { message: 'init' } });
      }
      if (name === 'DevGetDeviceInfo') {
        return Promise.resolve({
          type: 'DeviceInfo',
          message: {
            hw: { serial_no: 'PR2SERIAL' },
            fw: {
              boot: { version: '0.2.0' },
              app: { version: '1.2.3' },
            },
            bt: {
              app: { version: '4.5.6' },
            },
            status: {},
          },
        });
      }
      return Promise.reject(new Error(`unexpected call ${name}`));
    });
    const commands = { typedCall };

    (method as any).isBleReconnect = jest.fn(() => true);
    (method as any).device = {
      originalDescriptor: { id: 'ble-id', path: 'ble-path', protocolType: 'V2' },
      deviceConnector: { acquire },
      getCommands: () => commands,
      _updateFeatures: jest.fn(),
    };

    const versions = await (method as any).waitForProtocolV2FinalFeatures();

    expect(acquire).toHaveBeenCalledWith('ble-id', null, true, 'V2');
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'Ping',
      'Success',
      { message: 'init' },
      { timeoutMs: 5000 }
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'DevGetDeviceInfo',
      'DeviceInfo',
      expect.any(Object),
      { timeoutMs: 5000 }
    );
    expect(typedCall).not.toHaveBeenCalledWith('Initialize', 'Features', {});
    expect(versions).toEqual({
      bootloaderVersion: '0.2.0',
      bleVersion: '4.5.6',
      firmwareVersion: '1.2.3',
    });
  });

  test('passes resource, bootloader, BLE, SE and app files to DevFirmwareUpdate targets', async () => {
    const resourceZip = new JSZip();
    resourceZip.file('icons/home.png', new Uint8Array([1, 2, 3]));
    const resourceBinary = await resourceZip.generateAsync({ type: 'arraybuffer' });
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
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
    (method as any).waitForProtocolV2FirmwareUpdateComplete = jest
      .fn()
      .mockResolvedValue(undefined);

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

    expect((method as any).protocolV2CreateFolder).toHaveBeenCalledWith('vol0:res/');
    expect(writtenPaths).toEqual([
      'vol0:res/home.png',
      'vol0:bootloader.bin',
      'vol0:ble-firmware.bin',
      'vol0:se1-firmware.bin',
      'vol0:firmware.bin',
    ]);
    expect((method as any).protocolV2StartFirmwareUpdate).toHaveBeenCalledWith({
      targets: [
        { target_id: 10, path: 'vol0:res/' },
        { target_id: 1, path: 'vol0:bootloader.bin' },
        { target_id: 2, path: 'vol0:ble-firmware.bin' },
        { target_id: 3, path: 'vol0:se1-firmware.bin' },
        { target_id: 0, path: 'vol0:firmware.bin' },
      ],
    });
    expect((method as any).waitForProtocolV2FirmwareUpdateComplete).toHaveBeenCalled();
  });

  test('uses absolute processed_byte offsets and disables append for firmware file writes', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn(
      (
        _name: string,
        _resType: string,
        params: { file: { offset: number; data: { byteLength: number } } }
      ) =>
        Promise.resolve({
          type: 'FilesystemFile',
          message: {
            processed_byte: params.file.offset + params.file.data.byteLength,
          },
        })
    );

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    method.postProgressMessage = jest.fn();

    await (method as any).protocolV2CommonUpdateProcess({
      payload: new Uint8Array(4097).buffer,
      filePath: 'vol1:firmware.bin',
      processedSize: 0,
      totalSize: 4097,
    });

    const writePayloads = typedCall.mock.calls.map(call => call[2]);
    expect(writePayloads.map(payload => payload.file.offset)).toEqual([0, 4096]);
    expect(writePayloads.map(payload => payload.file.data.byteLength)).toEqual([4096, 1]);
    expect(writePayloads.map(payload => payload.overwrite)).toEqual([true, false]);
    expect(writePayloads.every(payload => payload.append === false)).toBe(true);
  });

  test('consumes Protocol V2 install progress before final update success', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({ type: 'Success', message: { message: 'ok' } });

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 0, path: 'vol1:firmware.bin' }],
    });

    const callOptions = typedCall.mock.calls[0][3];
    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DevFirmwareUpdateStatus']);
    expect(callOptions.intermediateTypes).toEqual(['DevFirmwareInstallProgress']);
    callOptions.onIntermediateResponse({
      type: 'DevFirmwareInstallProgress',
      message: { target_id: 0, progress: 42 },
    });

    expect(method.postProgressMessage).toHaveBeenCalledWith(42, 'installingFirmware');
  });

  test('accepts Protocol V2 firmware update status as start response', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DevFirmwareUpdateStatus',
      message: { targets: [{ target_id: 0, status: 1 }] },
    });

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 0, path: 'vol1:firmware.bin' }],
    });

    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DevFirmwareUpdateStatus']);
    expect(method.postTipMessage).toHaveBeenCalledWith('FirmwareUpdating');
  });
});

describe('Protocol V2 firmware update method', () => {
  test('returns DevFirmwareUpdateStatus from low-level update trigger', async () => {
    const method = new DevFirmwareUpdate({
      id: 1,
      payload: {
        method: 'devFirmwareUpdate',
        path: 'vol0:firmware.bin',
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({
      type: 'DevFirmwareUpdateStatus',
      message: { targets: [{ target_id: 0, status: 1 }] },
    });

    (method as any).device = {
      commands: { typedCall },
    };

    await expect(method.run()).resolves.toEqual({
      targets: [{ target_id: 0, status: 1 }],
    });
    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DevFirmwareUpdateStatus']);
  });
});

describe('Protocol V2 file write method', () => {
  test('uses demo-aligned overwrite and append defaults', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 1 } });
    const method = new FileWrite({
      id: 1,
      payload: {
        method: 'fileWrite',
        path: 'vol1:test.bin',
        offset: 1,
        totalSize: 2,
        data: new Uint8Array([1]),
      },
    });
    (method as any).device = { commands: { typedCall } };
    method.postMessage = jest.fn();

    method.init();
    await method.run();

    expect(typedCall).toHaveBeenCalledWith('FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 1,
        total_size: 2,
        data: new Uint8Array([1]),
      },
      overwrite: false,
      append: false,
      ui_percentage: 99,
    });
    expect(method.postMessage).toHaveBeenCalledWith({
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: { progress: 100 },
    });
  });

  test('splits data larger than the Protocol V2 file payload limit', async () => {
    const data = new Uint8Array(4097);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new FileWrite({
      id: 1,
      payload: {
        method: 'fileWrite',
        path: 'vol1:test.bin',
        offset: 0,
        totalSize: 4097,
        data,
      },
    });
    (method as any).device = { commands: { typedCall } };
    method.postMessage = jest.fn();

    method.init();
    const result = await method.run();

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(1, 'FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 0,
        total_size: 4097,
        data: data.slice(0, 4096),
      },
      overwrite: true,
      append: false,
      ui_percentage: 99,
    });
    expect(typedCall).toHaveBeenNthCalledWith(2, 'FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 4096,
        total_size: 4097,
        data: data.slice(4096),
      },
      overwrite: false,
      append: false,
      ui_percentage: 99,
    });
    expect(result).toMatchObject({
      path: 'vol1:test.bin',
      processed_byte: 4097,
      chunks: 2,
    });
    expect(method.postMessage).toHaveBeenNthCalledWith(1, {
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: { progress: 99 },
    });
    expect(method.postMessage).toHaveBeenNthCalledWith(2, {
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: { progress: 100 },
    });
  });
});

describe('Protocol V2 file read method', () => {
  test('reads full file in chunks when read length is 0', async () => {
    const firstChunk = new Uint8Array(64).fill(1);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { exist: true, size: 65, directory: false } })
      .mockResolvedValueOnce({ message: { data: firstChunk } })
      .mockResolvedValueOnce({ message: { data: new Uint8Array([2]) } });
    const method = new FileRead({
      id: 1,
      payload: {
        method: 'fileRead',
        path: 'vol1:test.bin',
        offset: 0,
        totalSize: 0,
        chunkLen: 64,
      },
    });
    (method as any).device = { commands: { typedCall } };

    method.init();
    const result = await method.run();

    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      {
        path: 'vol1:test.bin',
      }
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'FilesystemFileRead', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 0,
        total_size: 0,
      },
      chunk_len: 64,
      ui_percentage: 99,
    });
    expect(typedCall).toHaveBeenNthCalledWith(3, 'FilesystemFileRead', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 64,
        total_size: 0,
      },
      chunk_len: 1,
      ui_percentage: 99,
    });
    expect(result.data.byteLength).toBe(65);
    expect(result.data[0]).toBe(1);
    expect(result.data[64]).toBe(2);
    expect(result).toMatchObject({
      path: 'vol1:test.bin',
      offset: 0,
      total_size: 65,
      chunks: 2,
    });
  });

  test('decodes protobuf bytes hex string returned by transport', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        data: '0102ff',
      },
    });
    const method = new FileRead({
      id: 1,
      payload: {
        method: 'fileRead',
        path: 'vol0:test.bin',
        offset: 0,
        totalSize: 3,
        chunkLen: 512,
      },
    });
    (method as any).device = { commands: { typedCall } };

    method.init();
    const result = await method.run();

    expect(result.data).toEqual(new Uint8Array([1, 2, 255]));
  });
});
