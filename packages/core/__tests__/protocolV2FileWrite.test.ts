import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import {
  createProtocolV2AssetFileWriteRecovery,
  type ProtocolV2FileWriteOptions,
  writeProtocolV2File,
} from '../src/api/helpers/protocolV2FileWrite';
import { DataManager } from '../src/data-manager';
import { LoggerNames, getLogger } from '../src/utils/logger';

import type { DeviceCommands } from '../src/device/DeviceCommands';
import type { BaseMethod } from '../src/api/BaseMethod';
import type { MessageFromOneKey, TransportCallOptions } from '@onekeyfe/hd-transport';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('writeProtocolV2File', () => {
  describe('Pro2 / Neo asset pipelines', () => {
    type Request = {
      file: { path: string; offset: number; total_size: number; data: Uint8Array };
      overwrite: boolean;
      append: boolean;
      ui_percentage: number;
    };

    const createCommands = (deviceType = EDeviceType.Pro2) => {
      const requests: Request[] = [];
      const device = {
        isProtocolV2: () => true,
        getCurrentDeviceType: () => deviceType,
        state: { status: { mode: 'normal' }, versions: { firmware: '1.0.3', bootloader: '1.0.0' } },
      };
      const typedCall = jest.fn(
        async (
          _name: string,
          _response: string,
          first: Request,
          options?: TransportCallOptions
        ) => {
          let request: Request | undefined = first;
          let response: MessageFromOneKey = { type: 'FilesystemFile', message: {} };
          while (request) {
            requests.push(request);
            response = {
              type: 'FilesystemFile',
              message: {
                ...request.file,
                processed_byte: request.file.offset + request.file.data.byteLength,
              },
            };
            options?.fileWritePipeline?.onResponse(response);
            request = (await options?.fileWritePipeline?.next()) as Request | undefined;
          }
          return response;
        }
      );
      const commands = { device, typedCall } as unknown as DeviceCommands;
      return { commands, device, typedCall, requests };
    };

    beforeEach(() => {
      jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native');
      jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(true);
    });

    afterEach(() => jest.restoreAllMocks());

    test.each(
      [EDeviceType.Pro2, EDeviceType.Neo].flatMap(deviceType =>
        ['react-native', 'desktop-web-ble'].flatMap(env =>
          [
            'vol1:/wallpapers/wallpaper.okpkg',
            'vol1:/nft/nft-deadbeef-1760000000000.okpkg',
            'vol1:/portfolio/portfolio.okpkg.pending',
          ].map(path => ({ deviceType, env, path }))
        )
      )
    )(
      'pipelines $deviceType $path on $env using application version',
      async ({ deviceType, env, path }) => {
        jest.spyOn(DataManager, 'getSettings').mockReturnValue(env);
        const { commands, typedCall, requests } = createCommands(deviceType);
        const onProgress = jest.fn();

        await expect(
          writeProtocolV2File({
            commands,
            path,
            data: new Uint8Array(3601),
            overwrite: true,
            bleChunkSizeLimit: 1960,
            chunkSizeLimit: 4000,
            onProgress,
          })
        ).resolves.toMatchObject({ processed_byte: 3601, chunks: 3 });

        expect(typedCall).toHaveBeenCalledTimes(1);
        expect(typedCall.mock.calls[0][3]).toMatchObject({
          writeWithResponse: false,
          fileWritePipeline: { next: expect.any(Function), onResponse: expect.any(Function) },
        });
        expect(requests.map(request => request.file.offset)).toEqual([0, 1800, 3600]);
        expect(requests.map(request => request.file.data.byteLength)).toEqual([1800, 1800, 1]);
        expect(requests.map(request => request.overwrite)).toEqual([true, false, false]);
        expect(onProgress.mock.calls.map(([progress]) => progress.transferredBytes)).toEqual([
          1800, 3600, 3601,
        ]);
      }
    );

    test('does not replay a failed pipeline on the invalidated link', async () => {
      const { commands, typedCall } = createCommands();
      const timeout = new Error('BLE response timeout');
      typedCall.mockRejectedValueOnce(timeout);

      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/wallpapers/wallpaper.okpkg',
          data: new Uint8Array(3601),
          maxChunkRetries: 3,
        })
      ).rejects.toBe(timeout);
      expect(typedCall).toHaveBeenCalledTimes(1);
    });

    test.each(
      [EDeviceType.Pro2, EDeviceType.Neo].flatMap(deviceType =>
        ['react-native', 'desktop-web-ble'].flatMap(env =>
          [
            'vol1:/wallpapers/wallpaper.okpkg',
            'vol1:/nft/nft-deadbeef-1760000000000.okpkg',
            'vol1:/portfolio/portfolio.okpkg.pending',
          ].map(path => ({ deviceType, env, path }))
        )
      )
    )(
      'reconnects and restarts the dual-frame $deviceType $path upload on $env',
      async ({ deviceType, env, path }) => {
        jest.spyOn(DataManager, 'getSettings').mockReturnValue(env);
        const { commands, typedCall } = createCommands(deviceType);
        const fresh = createCommands(deviceType);
        const timeout = Object.assign(new Error('BLE response timeout'), {
          errorCode: HardwareErrorCode.BleTimeoutError,
        });
        typedCall.mockImplementationOnce((_name, _response, first, options) => {
          options?.fileWritePipeline?.onResponse({
            type: 'FilesystemFile',
            message: { ...first.file, processed_byte: 1800 },
          });
          return Promise.reject(timeout);
        });
        const recoverConnection = jest.fn().mockResolvedValue(fresh.commands);
        const onProgress = jest.fn();
        const metrics = jest.spyOn(getLogger(LoggerNames.Core), 'log');

        await expect(
          writeProtocolV2File({
            commands,
            overwrite: true,
            path,
            data: new Uint8Array(3601),
            maxChunkRetries: 3,
            recoverConnection,
            onProgress,
          })
        ).resolves.toMatchObject({ processed_byte: 3601, chunks: 3 });

        expect(typedCall).toHaveBeenCalledTimes(1);
        expect(recoverConnection).toHaveBeenCalledTimes(1);
        expect(metrics).toHaveBeenCalledWith(
          expect.stringContaining(`status=failed path=${path} bytes=1800/3601`)
        );
        expect(metrics).toHaveBeenLastCalledWith(
          expect.stringContaining('window=2 chunk=1800 retry=1 averageSpeed=')
        );
        expect(fresh.requests.map(request => request.file.offset)).toEqual([0, 1800, 3600]);
        expect(fresh.requests.map(request => request.overwrite)).toEqual([true, false, false]);
        expect(fresh.typedCall).toHaveBeenCalledTimes(1);
        expect(fresh.typedCall.mock.calls[0][3]?.fileWritePipeline).toBeDefined();
        expect(fresh.typedCall.mock.calls[0][3]?.timeoutMs).toBe(10_000);
        expect(onProgress.mock.calls.map(([progress]) => progress.transferredBytes)).toEqual([
          1800, 0, 1800, 3600, 3601,
        ]);
        expect(onProgress.mock.calls[onProgress.mock.calls.length - 1][0]).toMatchObject({
          retryCount: 1,
          progress: 100,
        });
      }
    );

    test('bounds dual-frame whole-file recovery to three extra attempts', async () => {
      const { commands, typedCall } = createCommands();
      const timeout = Object.assign(new Error('BLE response timeout'), {
        errorCode: HardwareErrorCode.BleTimeoutError,
      });
      typedCall.mockRejectedValue(timeout);
      const recoverConnection = jest.fn().mockResolvedValue(commands);
      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/wallpapers/wallpaper.okpkg',
          data: new Uint8Array(3601),
          maxChunkRetries: 3,
          recoverConnection,
        })
      ).rejects.toBe(timeout);
      expect(typedCall).toHaveBeenCalledTimes(4);
      expect(recoverConnection).toHaveBeenCalledTimes(3);
      expect(typedCall.mock.calls.every(call => !!call[3]?.fileWritePipeline)).toBe(true);
    });

    test('does not start a retry when cancelled during reconnect', async () => {
      const { commands, typedCall } = createCommands();
      const aborted = new Error('cancelled');
      let cancelled = false;
      typedCall.mockRejectedValueOnce(new Error('BLE response timeout'));
      const recoverConnection = jest.fn(() => {
        cancelled = true;
        return Promise.resolve(commands);
      });
      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/wallpapers/wallpaper.okpkg',
          data: new Uint8Array(3601),
          maxChunkRetries: 3,
          recoverConnection,
          throwIfAborted: () => {
            if (cancelled) throw aborted;
          },
        })
      ).rejects.toBe(aborted);
      expect(typedCall).toHaveBeenCalledTimes(1);
    });

    test('does not retry device rejections or callback failures', async () => {
      const { commands, typedCall } = createCommands();
      const failure = new Error('device rejected file');
      typedCall.mockRejectedValueOnce(failure);
      const recoverConnection = jest.fn();
      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/wallpapers/wallpaper.okpkg',
          data: new Uint8Array(3601),
          maxChunkRetries: 3,
          recoverConnection,
        })
      ).rejects.toBe(failure);
      expect(recoverConnection).not.toHaveBeenCalled();
    });

    test.each(['different-device', ''])(
      'rejects reconnect identity %s before unlocking or writing',
      async serialNo => {
        const { commands, device, typedCall } = createCommands();
        const state = {
          ...device.state,
          identity: { serialNo: 'test-device', deviceType: EDeviceType.Pro2 },
        };
        const acquire = jest.fn().mockResolvedValue(undefined);
        const initialize = jest.fn(() => {
          state.identity.serialNo = serialNo;
          return Promise.resolve(undefined);
        });
        const method = {
          device: { ...device, state, commands, acquire, initialize },
        } as unknown as BaseMethod;
        const recover = createProtocolV2AssetFileWriteRecovery(method);
        await expect(recover()).rejects.toMatchObject({
          errorCode: HardwareErrorCode.DeviceCheckDeviceIdError,
        });
        expect(acquire).toHaveBeenCalledWith('V2', { throwOnRunPromiseError: true });
        expect(typedCall).not.toHaveBeenCalled();
      }
    );

    test('refreshes unlock status after reconnect even when the original preflight completed', async () => {
      const { commands, device, typedCall } = createCommands();
      typedCall.mockResolvedValueOnce({ type: 'DeviceStatus', message: { unlocked: false } });
      const unlockDevice = jest.fn().mockResolvedValue({ unlocked: true });
      const method = {
        name: 'deviceUploadWallpaper',
        device: {
          ...device,
          state: {
            ...device.state,
            identity: { serialNo: 'test-device', deviceType: EDeviceType.Pro2 },
            status: { mode: 'normal', initialized: true },
          },
          commands,
          acquire: jest.fn().mockResolvedValue(undefined),
          initialize: jest.fn().mockResolvedValue(undefined),
          updateProtocolV2Status: (status: unknown) => status,
          unlockDevice,
          toMessageObject: () => ({}),
        },
        unlockPolicy: 'unlock-before-run',
        useDevicePassphraseState: false,
        protocolV2PreUnlockPinType: DeviceSessionPinType.Any,
        protocolV2UnlockContext: { preflightCompleted: true },
        postMessage: jest.fn(),
        payload: {},
      } as unknown as BaseMethod;
      await expect(createProtocolV2AssetFileWriteRecovery(method)()).resolves.toBe(commands);
      expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
      expect(unlockDevice).toHaveBeenCalledWith(DeviceSessionPinType.Any, expect.any(Object));
    });

    const serialCases: {
      name: string;
      firmware?: string;
      protocol?: boolean;
      mode?: string;
      deviceType?: EDeviceType;
      env?: string;
      options?: Partial<ProtocolV2FileWriteOptions>;
    }[] = [
      { name: 'old application with a new bootloader', firmware: '1.0.2' },
      { name: 'unknown application', firmware: '' },
      { name: 'invalid application version', firmware: 'unknown' },
      { name: 'application prerelease', firmware: '1.0.3-rc.1' },
      { name: 'Protocol V1', protocol: false },
      { name: 'bootloader runtime', mode: 'bootloader' },
      { name: 'another model', deviceType: EDeviceType.Pro },
      { name: 'WebUSB', env: 'web' },
      { name: 'LowLevel transport', env: 'lowlevel' },
      { name: 'a generic file', options: { path: 'vol1:/other.bin' } },
      { name: 'a partial file', options: { totalSize: 7200 } },
      { name: 'non-overwriting writes', options: { overwrite: false } },
      { name: 'append', options: { append: true } },
      { name: 'offset writes', options: { offset: 1 } },
      { name: 'explicit pacing', options: { paceMs: 1 } },
      { name: 'acknowledged characteristic writes', options: { writeWithResponse: true } },
    ];

    test.each(serialCases)('keeps $name serial', async testCase => {
      const { commands, device, typedCall } = createCommands(testCase.deviceType);
      device.isProtocolV2 = () => testCase.protocol ?? true;
      device.state.versions.firmware = testCase.firmware ?? '1.0.3';
      device.state.versions.bootloader = '9.0.0';
      device.state.status.mode = testCase.mode ?? 'normal';
      jest.spyOn(DataManager, 'getSettings').mockReturnValue(testCase.env ?? 'react-native');

      await writeProtocolV2File({
        commands,
        overwrite: true,
        path: 'vol1:/wallpapers/wallpaper.okpkg',
        data: new Uint8Array(3601),
        ...testCase.options,
      });

      expect(typedCall.mock.calls.every(call => !call[3]?.fileWritePipeline)).toBe(true);
    });

    test('drains an in-flight response on cancellation before rejecting', async () => {
      const { commands, typedCall } = createCommands();
      const aborted = new Error('upload cancelled');
      let cancelled = false;
      const drained = jest.fn();
      const onProgress = jest.fn();
      typedCall.mockImplementationOnce(async (_name, _response, first, options) => {
        const pipeline = options?.fileWritePipeline;
        if (!pipeline) throw new Error('Expected a file write pipeline');
        const second = (await pipeline.next()) as Request;
        cancelled = true;
        expect(() =>
          pipeline.onResponse({ type: 'FilesystemFile', message: { processed_byte: 1800 } })
        ).not.toThrow();
        await expect(pipeline.next()).resolves.toBeUndefined();
        const response = { type: 'FilesystemFile', message: { processed_byte: 3600 } };
        pipeline.onResponse(response);
        drained(first, second);
        return response;
      });

      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/wallpapers/wallpaper.okpkg',
          data: new Uint8Array(5401),
          throwIfAborted: () => {
            if (cancelled) throw aborted;
          },
          onProgress,
        })
      ).rejects.toBe(aborted);
      expect(drained).toHaveBeenCalledTimes(1);
      expect(onProgress).not.toHaveBeenCalled();
      expect(typedCall).toHaveBeenCalledTimes(1);
    });

    test('raises a progress callback error after stopping further chunks', async () => {
      const { commands, typedCall, requests } = createCommands();
      const callbackError = new Error('progress callback failed');

      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/portfolio/portfolio.okpkg.pending',
          data: new Uint8Array(3601),
          onProgress: () => {
            throw callbackError;
          },
        })
      ).rejects.toBe(callbackError);
      expect(requests).toHaveLength(1);
      expect(typedCall).toHaveBeenCalledTimes(1);
    });

    test('rejects a pipeline that returns without confirming every chunk', async () => {
      const { commands, typedCall } = createCommands();
      typedCall.mockResolvedValueOnce({
        type: 'FilesystemFile',
        message: { processed_byte: 3601 },
      });
      await expect(
        writeProtocolV2File({
          commands,
          overwrite: true,
          path: 'vol1:/wallpapers/wallpaper.okpkg',
          data: new Uint8Array(3601),
        })
      ).rejects.toThrow('before the complete file was confirmed');
      expect(typedCall).toHaveBeenCalledTimes(1);
    });
  });

  test('allows a verified caller-specific BLE chunk limit', async () => {
    const getSettingsSpy = jest
      .spyOn(DataManager, 'getSettings')
      .mockReturnValue('react-native' as any);
    const isBleConnectSpy = jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(true);
    const data = new Uint8Array(1961);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });

    try {
      await writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/wallpaper.okpkg',
        data,
        bleChunkSizeLimit: 1960,
      });
    } finally {
      getSettingsSpy.mockRestore();
      isBleConnectSpy.mockRestore();
    }

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[0][2].file.data).toEqual(data.slice(0, 1960));
    expect(typedCall.mock.calls[1][2].file.data).toEqual(data.slice(1960));
  });

  test('does not apply the BLE-only limit to WebUSB', async () => {
    const data = new Uint8Array(1961);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });

    await writeProtocolV2File({
      commands: { typedCall } as any,
      path: 'vol1:/wallpapers/wallpaper.okpkg',
      data,
      bleChunkSizeLimit: 1960,
    });

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls[0][2].file.data).toEqual(data);
  });

  test('按分片写入并只在首片设置 overwrite', async () => {
    const data = new Uint8Array(4097);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const onProgress = jest.fn();

    const result = await writeProtocolV2File({
      commands: { typedCall } as any,
      path: 'vol1:/wallpapers/test.bin',
      data,
      totalSize: data.byteLength,
      overwrite: true,
      onProgress,
    });

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[0][2]).toMatchObject({
      file: { offset: 0, total_size: 4097, data: data.slice(0, 4000) },
      overwrite: true,
      append: false,
      ui_percentage: 0,
    });
    expect(typedCall.mock.calls[1][2]).toMatchObject({
      file: { offset: 4000, total_size: 4097, data: data.slice(4000) },
      overwrite: false,
      append: false,
      ui_percentage: 100,
    });
    expect(result).toMatchObject({ processed_byte: 4097, chunks: 2 });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ progress: 100, transferredBytes: 4097, totalBytes: 4097 })
    );
  });

  test('拒绝越过文件末尾的 processed_byte', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 10 } });

    await expect(
      writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/test.bin',
        data: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });
  });

  test('设备返回未前进的绝对 processed_byte 时立即失败', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 0 } });

    await expect(
      writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/test.bin',
        data: new Uint8Array([1, 2, 3]),
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });
  });

  test('拒绝非 FilesystemFile 响应', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'CallMethodError',
      message: { error: 'unexpected response' },
    });

    await expect(
      writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/test.bin',
        data: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'FilesystemFileWrite received unexpected response CallMethodError',
    });
  });

  test('BLE 响应超时时原偏移重试且不重复上报进度', async () => {
    const timeoutError = Object.assign(new Error('Lowlevel response timeout'), {
      errorCode: HardwareErrorCode.BleTimeoutError,
    });
    const typedCall = jest
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ message: { processed_byte: 3 } });
    const onProgress = jest.fn();

    await expect(
      writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/test.bin',
        data: new Uint8Array([1, 2, 3]),
        maxChunkRetries: 2,
        onProgress,
      })
    ).resolves.toMatchObject({ processed_byte: 3, chunks: 1 });

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[1][2]).toEqual(typedCall.mock.calls[0][2]);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  test('支持固件上传的响应写入选项和全局设备进度', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 3 } });
    const getUiPercentage = jest.fn().mockReturnValue(42);

    await writeProtocolV2File({
      commands: { typedCall } as any,
      path: 'vol0:/firmware.bin',
      data: new Uint8Array([1, 2, 3]),
      writeWithResponse: true,
      getUiPercentage,
    });

    expect(getUiPercentage).toHaveBeenCalledWith({
      offset: 0,
      chunkLength: 3,
      totalSize: 3,
    });
    expect(typedCall).toHaveBeenCalledWith(
      'FilesystemFileWrite',
      'FilesystemFile',
      expect.objectContaining({ ui_percentage: 42 }),
      expect.objectContaining({
        writeWithResponse: true,
        onWriteCompleted: expect.any(Function),
      })
    );
  });

  test('记录主机整帧写入与设备响应等待的分段耗时', async () => {
    const log = getLogger(LoggerNames.Core);
    const logSpy = jest.spyOn(log, 'log').mockImplementation(() => undefined);
    const typedCall = jest.fn().mockImplementation((_type, _resType, _request, options) => {
      options.onWriteCompleted({ elapsedMs: 25, frameBytes: 128 });
      return Promise.resolve({ message: { processed_byte: 3 } });
    });
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_010)
      .mockReturnValueOnce(1_040)
      .mockReturnValueOnce(1_050);

    try {
      await writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol0:/firmware.bin',
        data: new Uint8Array([1, 2, 3]),
      });

      expect(logSpy).toHaveBeenLastCalledWith(
        '[FileWrite] metrics transport=unknown status=completed path=vol0:/firmware.bin bytes=3/3 elapsed=0.05s speed=0.06 KiB/s hostWriteTotal=0.03s responseWaitTotal=0.03s measuredAttempts=1 window=1 chunk=4000 retry=0 averageSpeed=0.06 KiB/s'
      );
    } finally {
      dateNowSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  test('按确认分片的时间窗口记录实时传输速率', async () => {
    const data = new Uint8Array(4097);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const onProgress = jest.fn();
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000);

    try {
      await writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/test.bin',
        data,
        onProgress,
      });
    } finally {
      dateNowSpy.mockRestore();
    }

    expect(onProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        transferredBytes: 4000,
        rateBytesPerSecond: 4000,
        elapsedMs: 1000,
      })
    );
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        transferredBytes: 4097,
        rateBytesPerSecond: 97,
        elapsedMs: 2000,
      })
    );
  });

  test('通过 Core Log 每十秒输出一次 BLE 传输关键指标', async () => {
    const log = getLogger(LoggerNames.Core);
    const logSpy = jest.spyOn(log, 'log').mockImplementation(() => undefined);
    const getSettingsSpy = jest
      .spyOn(DataManager, 'getSettings')
      .mockReturnValue('react-native' as any);
    const isBleConnectSpy = jest.spyOn(DataManager, 'isBleConnect').mockReturnValue(true);
    const data = new Uint8Array(5400);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(5_000)
      .mockReturnValueOnce(11_000)
      .mockReturnValueOnce(15_000);

    try {
      await writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol1:/wallpapers/test.bin',
        data,
      });

      expect(logSpy).toHaveBeenCalledTimes(3);
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        '[FileWrite] started transport=BLE path=vol1:/wallpapers/test.bin bytes=5400 offset=0 chunk=1800'
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        '[FileWrite] metrics transport=BLE status=progress path=vol1:/wallpapers/test.bin bytes=3600/5400 elapsed=10.00s speed=0.35 KiB/s window=1 chunk=1800 retry=0 averageSpeed=0.35 KiB/s'
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        3,
        '[FileWrite] metrics transport=BLE status=completed path=vol1:/wallpapers/test.bin bytes=5400/5400 elapsed=14.00s speed=0.44 KiB/s window=1 chunk=1800 retry=0 averageSpeed=0.38 KiB/s'
      );
    } finally {
      dateNowSpy.mockRestore();
      getSettingsSpy.mockRestore();
      isBleConnectSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  test('写入失败时通过 Core Log 输出已传输字节和平均速率', async () => {
    const log = getLogger(LoggerNames.Core);
    const logSpy = jest.spyOn(log, 'log').mockImplementation(() => undefined);
    const typedCall = jest.fn().mockRejectedValue(new Error('write failed'));
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000);

    try {
      await expect(
        writeProtocolV2File({
          commands: { typedCall } as any,
          path: 'vol1:/wallpapers/test.bin',
          data: new Uint8Array(4000),
        })
      ).rejects.toThrow('write failed');

      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        '[FileWrite] started transport=unknown path=vol1:/wallpapers/test.bin bytes=4000 offset=0 chunk=4000'
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        '[FileWrite] metrics transport=unknown status=failed path=vol1:/wallpapers/test.bin bytes=0/4000 elapsed=1.00s speed=0.00 KiB/s window=1 chunk=4000 retry=0 averageSpeed=0.00 KiB/s'
      );
    } finally {
      dateNowSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
