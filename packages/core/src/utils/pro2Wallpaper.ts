import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

// RGB565 pixel packing and dithering index calculation require bitwise operations.
/* eslint-disable no-bitwise */

export const PRO2_WALLPAPER_WIDTH = 604;
export const PRO2_WALLPAPER_HEIGHT = 1024;

export type Pro2WallpaperColorFormat = 'RGB565' | 'RGB565A8' | 'I8';

export type Pro2WallpaperEncoding = 'rgb565' | 'i8-lz4';

export type Pro2ImageAlphaMode = 'preserve' | 'black-background';

const COLOR_FORMAT_RGB565 = 0x12;
const COLOR_FORMAT_RGB565A8 = 0x14;
const COLOR_FORMAT_I8 = 0x0a;
const IMAGE_FLAG_COMPRESSED = 0x0008;
const IMAGE_COMPRESSION_LZ4 = 0x00000002;
const I8_PALETTE_SIZE = 256 * 4;
const I8_RED_LEVELS = 6;
const I8_GREEN_LEVELS = 7;
const I8_BLUE_LEVELS = 6;
const LZ4_MIN_MATCH = 4;
const LZ4_LAST_LITERALS = 5;
const LZ4_MATCH_FIND_LIMIT = 12;
const LZ4_HASH_BITS = 16;
const LZ4_HASH_MULTIPLIER = -1640531535;

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

function writeLz4Length(output: Uint8Array, offset: number, length: number) {
  let cursor = offset;
  let remaining = length;
  while (remaining >= 0xff) {
    output[cursor] = 0xff;
    cursor += 1;
    remaining -= 0xff;
  }
  output[cursor] = remaining;
  return cursor + 1;
}

function readUint32LittleEndian(data: Uint8Array, offset: number) {
  return (
    data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
  );
}

function getLz4Hash(sequence: number) {
  return (Math.imul(sequence, LZ4_HASH_MULTIPLIER) >>> (32 - LZ4_HASH_BITS)) & 0xffff;
}

function compressLz4Block(input: Uint8Array) {
  const output = new Uint8Array(input.byteLength + Math.floor(input.byteLength / 0xff) + 16);
  const hashTable = new Int32Array(1 << LZ4_HASH_BITS);
  hashTable.fill(-1);

  let anchor = 0;
  let inputOffset = 0;
  let outputOffset = 0;
  const matchFindEnd = input.byteLength - LZ4_MATCH_FIND_LIMIT;
  const matchCopyEnd = input.byteLength - LZ4_LAST_LITERALS;

  while (inputOffset <= matchFindEnd) {
    const sequence = readUint32LittleEndian(input, inputOffset);
    const hash = getLz4Hash(sequence);
    const reference = hashTable[hash];
    hashTable[hash] = inputOffset;

    const matchOffset = inputOffset - reference;
    const hasMatch =
      reference >= 0 &&
      matchOffset <= 0xffff &&
      readUint32LittleEndian(input, reference) === sequence;
    if (hasMatch) {
      let matchLength = LZ4_MIN_MATCH;
      while (
        inputOffset + matchLength < matchCopyEnd &&
        input[reference + matchLength] === input[inputOffset + matchLength]
      ) {
        matchLength += 1;
      }

      const literalLength = inputOffset - anchor;
      const encodedMatchLength = matchLength - LZ4_MIN_MATCH;
      const tokenOffset = outputOffset;
      outputOffset += 1;
      output[tokenOffset] =
        (Math.min(literalLength, 0x0f) << 4) | Math.min(encodedMatchLength, 0x0f);

      if (literalLength >= 0x0f) {
        outputOffset = writeLz4Length(output, outputOffset, literalLength - 0x0f);
      }
      output.set(input.subarray(anchor, inputOffset), outputOffset);
      outputOffset += literalLength;

      output[outputOffset] = matchOffset & 0xff;
      output[outputOffset + 1] = matchOffset >> 8;
      outputOffset += 2;
      if (encodedMatchLength >= 0x0f) {
        outputOffset = writeLz4Length(output, outputOffset, encodedMatchLength - 0x0f);
      }

      const matchStart = inputOffset;
      inputOffset += matchLength;
      anchor = inputOffset;
      for (
        let cursor = Math.max(matchStart + 1, inputOffset - 2);
        cursor < inputOffset;
        cursor += 1
      ) {
        if (cursor <= matchFindEnd) {
          hashTable[getLz4Hash(readUint32LittleEndian(input, cursor))] = cursor;
        }
      }
    } else {
      inputOffset += 1;
    }
  }

  const literalLength = input.byteLength - anchor;
  const tokenOffset = outputOffset;
  outputOffset += 1;
  output[tokenOffset] = Math.min(literalLength, 0x0f) << 4;
  if (literalLength >= 0x0f) {
    outputOffset = writeLz4Length(output, outputOffset, literalLength - 0x0f);
  }
  output.set(input.subarray(anchor), outputOffset);
  outputOffset += literalLength;

  return output.slice(0, outputOffset);
}

function quantizeChannel(value: number, levels: number) {
  return Math.floor((value * (levels - 1) + 0x7f) / 0xff);
}

function expandChannel(value: number, levels: number) {
  return Math.floor((value * 0xff + Math.floor((levels - 1) / 2)) / (levels - 1));
}

function encodePro2I8Lz4(options: {
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
  const stride = width;
  const rawData = new Uint8Array(I8_PALETTE_SIZE + stride * height);

  for (let red = 0; red < I8_RED_LEVELS; red += 1) {
    for (let green = 0; green < I8_GREEN_LEVELS; green += 1) {
      for (let blue = 0; blue < I8_BLUE_LEVELS; blue += 1) {
        const paletteIndex = (red * I8_GREEN_LEVELS + green) * I8_BLUE_LEVELS + blue;
        const paletteOffset = paletteIndex * 4;
        // LVGL stores its ARGB8888 palette as B, G, R, A bytes on little-endian devices.
        rawData[paletteOffset] = expandChannel(blue, I8_BLUE_LEVELS);
        rawData[paletteOffset + 1] = expandChannel(green, I8_GREEN_LEVELS);
        rawData[paletteOffset + 2] = expandChannel(red, I8_RED_LEVELS);
        rawData[paletteOffset + 3] = 0xff;
      }
    }
  }

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const sourceOffset = pixel * 4;
    const alpha = rgba[sourceOffset + 3];
    const red = Math.round((rgba[sourceOffset] * alpha) / 0xff);
    const green = Math.round((rgba[sourceOffset + 1] * alpha) / 0xff);
    const blue = Math.round((rgba[sourceOffset + 2] * alpha) / 0xff);
    const paletteIndex =
      (quantizeChannel(red, I8_RED_LEVELS) * I8_GREEN_LEVELS +
        quantizeChannel(green, I8_GREEN_LEVELS)) *
        I8_BLUE_LEVELS +
      quantizeChannel(blue, I8_BLUE_LEVELS);
    rawData[I8_PALETTE_SIZE + pixel] = paletteIndex;
  }

  const compressed = compressLz4Block(rawData);
  const data = new Uint8Array(24 + compressed.byteLength);
  const view = new DataView(data.buffer);
  data[0] = 0x19;
  data[1] = COLOR_FORMAT_I8;
  view.setUint16(2, IMAGE_FLAG_COMPRESSED, true);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  view.setUint16(8, stride, true);
  view.setUint16(10, 0, true);
  view.setUint32(12, IMAGE_COMPRESSION_LZ4, true);
  view.setUint32(16, compressed.byteLength, true);
  view.setUint32(20, rawData.byteLength, true);
  data.set(compressed, 24);
  return { data, colorFormat: 'I8' };
}

export function encodePro2Image(options: {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
  alphaMode?: Pro2ImageAlphaMode;
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

  const alphaMode = options.alphaMode ?? 'preserve';
  let hasTransparency = false;
  if (alphaMode === 'preserve') {
    for (let index = 3; index < rgba.length; index += 4) {
      if (rgba[index] !== 0xff) {
        hasTransparency = true;
        break;
      }
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
      const alpha = rgba[sourceOffset + 3];
      const redChannel =
        alphaMode === 'black-background'
          ? Math.round((rgba[sourceOffset] * alpha) / 0xff)
          : rgba[sourceOffset];
      const greenChannel =
        alphaMode === 'black-background'
          ? Math.round((rgba[sourceOffset + 1] * alpha) / 0xff)
          : rgba[sourceOffset + 1];
      const blueChannel =
        alphaMode === 'black-background'
          ? Math.round((rgba[sourceOffset + 2] * alpha) / 0xff)
          : rgba[sourceOffset + 2];
      const red = Math.min(redChannel + RED_THRESHOLD[thresholdIndex], 0xff) & 0xf8;
      const green = Math.min(greenChannel + GREEN_THRESHOLD[thresholdIndex], 0xff) & 0xfc;
      const blue = Math.min(blueChannel + BLUE_THRESHOLD[thresholdIndex], 0xff) & 0xf8;
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

export function encodePro2Wallpaper(options: {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
  encoding?: Pro2WallpaperEncoding;
}): { data: Uint8Array; colorFormat: Pro2WallpaperColorFormat } {
  if (options.encoding === 'i8-lz4') {
    return encodePro2I8Lz4(options);
  }
  return encodePro2Image(options);
}
