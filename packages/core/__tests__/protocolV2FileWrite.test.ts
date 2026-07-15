import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { writeProtocolV2File } from '../src/api/helpers/protocolV2FileWrite';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('writeProtocolV2File', () => {
  test('按分片写入并只在首片设置 overwrite', async () => {
    const data = new Uint8Array(4097);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const onProgress = jest.fn();

    const result = await writeProtocolV2File({
      commands: { typedCall } as any,
      path: 'vol0:/wallpapers/user/test.bin',
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
        path: 'vol0:/wallpapers/user/test.bin',
        data: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });
  });

  test('设备返回未前进的绝对 processed_byte 时立即失败', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 0 } });

    await expect(
      writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol0:/wallpapers/user/test.bin',
        data: new Uint8Array([1, 2, 3]),
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });
  });
});
