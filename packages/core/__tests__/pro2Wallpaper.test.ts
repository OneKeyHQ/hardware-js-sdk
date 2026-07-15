import { encodePro2Wallpaper } from '../src/utils/pro2Wallpaper';

describe('encodePro2Wallpaper', () => {
  test('encodes opaque pixels as aligned LVGL v9 RGB565 data', () => {
    const result = encodePro2Wallpaper({
      width: 2,
      height: 1,
      rgba: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
    });

    expect(result.colorFormat).toBe('RGB565');
    expect(Array.from(result.data.slice(0, 12))).toEqual([
      0x19, 0x12, 0, 0, 2, 0, 1, 0, 4, 0, 0, 0,
    ]);
    expect(Array.from(result.data.slice(12))).toEqual([0x00, 0xf0, 0xc0, 0x07]);
  });

  test('encodes transparent pixels as RGB565A8 with alpha plane after RGB data', () => {
    const result = encodePro2Wallpaper({
      width: 2,
      height: 1,
      rgba: new Uint8Array([0, 0, 255, 128, 255, 255, 255, 255]),
    });

    expect(result.colorFormat).toBe('RGB565A8');
    expect(result.data[1]).toBe(0x14);
    expect(Array.from(result.data.slice(8, 10))).toEqual([4, 0]);
    expect(Array.from(result.data.slice(12))).toEqual([0x1f, 0x00, 0xff, 0xff, 128, 255]);
  });

  test('rejects invalid dimensions and RGBA byte length', () => {
    expect(() => encodePro2Wallpaper({ width: 0, height: 1, rgba: new Uint8Array() })).toThrow(
      'width'
    );
    expect(() => encodePro2Wallpaper({ width: 2, height: 1, rgba: new Uint8Array(4) })).toThrow(
      '8'
    );
  });
});
