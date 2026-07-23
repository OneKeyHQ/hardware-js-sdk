import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

// RGB565 像素打包和抖动索引必须使用位运算。
/* eslint-disable no-bitwise */

export const PRO2_WALLPAPER_WIDTH = 604;
export const PRO2_WALLPAPER_HEIGHT = 1024;

export type Pro2WallpaperColorFormat = 'RGB565' | 'RGB565A8';

const COLOR_FORMAT_RGB565 = 0x12;
const COLOR_FORMAT_RGB565A8 = 0x14;

const RED_THRESHOLD = [
  1, 7, 3, 5, 0, 8, 2, 6, 7, 1, 5, 3, 8, 0, 6, 2, 3, 5, 0, 8, 2, 6, 1, 7, 5, 3, 8, 0, 6, 2, 7, 1, 0,
  8, 2, 6, 1, 7, 3, 5, 8, 0, 6, 2, 7, 1, 5, 3, 2, 6, 1, 7, 3, 5, 0, 8, 6, 2, 7, 1, 5, 3, 8, 0,
];
const GREEN_THRESHOLD = [
  1, 3, 2, 2, 3, 1, 2, 2, 2, 2, 0, 4, 2, 2, 4, 0, 3, 1, 2, 2, 1, 3, 2, 2, 2, 2, 4, 0, 2, 2, 0, 4, 1,
  3, 2, 2, 3, 1, 2, 2, 2, 2, 0, 4, 2, 2, 4, 0, 3, 1, 2, 2, 1, 3, 2, 2, 2, 2, 4, 0, 2, 2, 0, 4,
];
const BLUE_THRESHOLD = [
  5, 3, 8, 0, 6, 2, 7, 1, 3, 5, 0, 8, 2, 6, 1, 7, 8, 0, 6, 2, 7, 1, 5, 3, 0, 8, 2, 6, 1, 7, 3, 5, 6,
  2, 7, 1, 5, 3, 8, 0, 2, 6, 1, 7, 3, 5, 0, 8, 7, 1, 5, 3, 8, 0, 6, 2, 1, 7, 3, 5, 0, 8, 2, 6,
];

function invalidParameter(message: string): Error {
  return ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);
}

function asBytes(rgba: Uint8Array | ArrayBuffer): Uint8Array {
  return rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba);
}

function align(value: number, boundary: number): number {
  return Math.ceil(value / boundary) * boundary;
}

export function encodePro2Wallpaper(options: {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
}): { data: Uint8Array; colorFormat: Pro2WallpaperColorFormat } {
  const { width, height } = options;
  if (!Number.isInteger(width) || width <= 0 || width > 0xffff) {
    throw invalidParameter('Wallpaper width must be an integer between 1 and 65535.');
  }
  if (!Number.isInteger(height) || height <= 0 || height > 0xffff) {
    throw invalidParameter('Wallpaper height must be an integer between 1 and 65535.');
  }

  const rgba = asBytes(options.rgba);
  const expectedLength = width * height * 4;
  if (rgba.byteLength !== expectedLength) {
    throw invalidParameter(
      `Wallpaper RGBA data length must be ${expectedLength} bytes, received ${rgba.byteLength}.`
    );
  }

  let hasTransparency = false;
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] !== 0xff) {
      hasTransparency = true;
      break;
    }
  }

  const colorFormat: Pro2WallpaperColorFormat = hasTransparency ? 'RGB565A8' : 'RGB565';
  const stride = align(width * 2, 4);
  const alphaStride = stride / 2;
  const rgbSize = stride * height;
  const alphaSize = hasTransparency ? alphaStride * height : 0;
  const data = new Uint8Array(12 + rgbSize + alphaSize);
  const view = new DataView(data.buffer);

  data[0] = 0x19;
  data[1] = hasTransparency ? COLOR_FORMAT_RGB565A8 : COLOR_FORMAT_RGB565;
  view.setUint16(2, 0, true);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  view.setUint16(8, stride, true);
  view.setUint16(10, 0, true);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (y * width + x) * 4;
      const thresholdIndex = ((y & 7) << 3) + (x & 7);
      let red = Math.min(rgba[sourceOffset] + RED_THRESHOLD[thresholdIndex], 0xff) & 0xf8;
      let green = Math.min(rgba[sourceOffset + 1] + GREEN_THRESHOLD[thresholdIndex], 0xff) & 0xfc;
      let blue = Math.min(rgba[sourceOffset + 2] + BLUE_THRESHOLD[thresholdIndex], 0xff) & 0xf8;
      if (!hasTransparency) {
        const alpha = rgba[sourceOffset + 3];
        red = (red * alpha) >> 8;
        green = (green * alpha) >> 8;
        blue = (blue * alpha) >> 8;
      }
      const rgb565 = ((red >> 3) << 11) | ((green >> 2) << 5) | (blue >> 3);
      const rgbOffset = 12 + y * stride + x * 2;
      data[rgbOffset] = rgb565 & 0xff;
      data[rgbOffset + 1] = rgb565 >> 8;

      if (hasTransparency) {
        data[12 + rgbSize + y * alphaStride + x] = rgba[sourceOffset + 3];
      }
    }
  }

  return { data, colorFormat };
}
