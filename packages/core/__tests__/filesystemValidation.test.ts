import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { validateProtocolV2FilesystemPath } from '../src/api/helpers/filesystemValidation';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('validateProtocolV2FilesystemPath', () => {
  test('兼容并保留设备现有的卷内相对路径格式', () => {
    expect(validateProtocolV2FilesystemPath('vol1:test.bin', 'path')).toBe('vol1:test.bin');
  });

  test('目录查询可以使用卷根目录', () => {
    expect(
      validateProtocolV2FilesystemPath('VOL1:', 'path', {
        allowVolumeRoot: true,
      })
    ).toBe('vol1:');
  });

  test.each([
    'vol1:/../firmware.bin',
    'vol1:/wallets/./test.bin',
    'vol1:/wallets//test.bin',
    'vol1:\\wallets\\test.bin',
    'vol2:/test.bin',
    '/test.bin',
  ])('拒绝不安全或未知范围的路径：%s', path => {
    expect(() => validateProtocolV2FilesystemPath(path, 'path')).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      })
    );
  });

  test('文件操作不允许使用卷根目录', () => {
    expect(() => validateProtocolV2FilesystemPath('vol1:', 'path')).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      })
    );
  });

  test('按 UTF-8 字节数拒绝超出设备最小路径缓冲区的路径', () => {
    expect(() => validateProtocolV2FilesystemPath(`vol1:/${'测'.repeat(41)}`, 'path')).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      })
    );
  });
});
