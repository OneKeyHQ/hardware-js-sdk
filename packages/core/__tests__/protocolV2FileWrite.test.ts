import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { writeProtocolV2File } from '../src/api/helpers/protocolV2FileWrite';
import { DataManager } from '../src/data-manager';
import { LoggerNames, getLogger } from '../src/utils/logger';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('writeProtocolV2File', () => {
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
        '[FileWrite] metrics transport=unknown status=completed path=vol0:/firmware.bin bytes=3/3 elapsed=0.05s speed=0.06 KiB/s hostWriteTotal=0.03s responseWaitTotal=0.03s measuredAttempts=1'
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
        '[FileWrite] metrics transport=BLE status=progress path=vol1:/wallpapers/test.bin bytes=3600/5400 elapsed=10.00s speed=0.35 KiB/s'
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        3,
        '[FileWrite] metrics transport=BLE status=completed path=vol1:/wallpapers/test.bin bytes=5400/5400 elapsed=14.00s speed=0.44 KiB/s'
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
        '[FileWrite] metrics transport=unknown status=failed path=vol1:/wallpapers/test.bin bytes=0/4000 elapsed=1.00s speed=0.00 KiB/s'
      );
    } finally {
      dateNowSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
