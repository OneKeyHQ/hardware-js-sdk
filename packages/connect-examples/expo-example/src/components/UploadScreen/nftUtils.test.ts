import { Image, Platform } from 'react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import { decode as decodeJpeg } from 'jpeg-js';

import { calculateCoverResize, imageSourceToRgba } from './nftUtils';

jest.mock('react-native', () => ({
  Image: { getSize: jest.fn() },
  Platform: { OS: 'web' },
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

jest.mock('jpeg-js', () => ({
  decode: jest.fn(),
}));

describe('Protocol V2 原生图片转换', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.restoreAllMocks();
  });

  test('按 cover 规则生成居中的精确裁剪区域', () => {
    expect(calculateCoverResize(1200, 800, 604, 1024)).toEqual({
      width: 1536,
      height: 1024,
      originX: 466,
      originY: 0,
    });
  });

  test('React Native 使用 ImageManipulator 和 JPEG 解码生成精确 RGBA', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(8, 4));
    (manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///cache/transformed.jpg',
      width: 2,
      height: 3,
      base64: 'AA==',
    });
    const rgba = new Uint8Array(2 * 3 * 4).fill(255);
    (decodeJpeg as jest.Mock).mockReturnValue({ width: 2, height: 3, data: rgba });

    await expect(imageSourceToRgba('file:///source.png', 2, 3)).resolves.toEqual(rgba);
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///source.png',
      [
        { resize: { width: 6, height: 3 } },
        { crop: { originX: 2, originY: 0, width: 2, height: 3 } },
      ],
      { compress: 1, format: 'jpeg', base64: true }
    );
  });
});
