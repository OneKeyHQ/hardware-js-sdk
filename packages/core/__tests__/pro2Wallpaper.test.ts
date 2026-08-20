import { encodePro2Wallpaper } from '../src/utils/pro2Wallpaper';

// The test decoder mirrors LZ4's bit-packed token and offset format.
/* eslint-disable no-bitwise */

function decodeLz4Block(data: Uint8Array, expectedLength: number) {
  const output = new Uint8Array(expectedLength);
  let inputOffset = 0;
  let outputOffset = 0;

  const readLength = (initialLength: number) => {
    let length = initialLength;
    if (length === 0x0f) {
      let extension = 0xff;
      while (extension === 0xff) {
        extension = data[inputOffset];
        inputOffset += 1;
        length += extension;
      }
    }
    return length;
  };

  while (inputOffset < data.byteLength) {
    const token = data[inputOffset];
    inputOffset += 1;
    const literalLength = readLength(token >> 4);
    output.set(data.subarray(inputOffset, inputOffset + literalLength), outputOffset);
    inputOffset += literalLength;
    outputOffset += literalLength;
    if (inputOffset >= data.byteLength) break;

    const matchOffset = data[inputOffset] | (data[inputOffset + 1] << 8);
    inputOffset += 2;
    const matchLength = readLength(token & 0x0f) + 4;
    for (let index = 0; index < matchLength; index += 1) {
      output[outputOffset] = output[outputOffset - matchOffset];
      outputOffset += 1;
    }
  }

  expect(outputOffset).toBe(expectedLength);
  return output;
}

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
    expect(Array.from(result.data.slice(12))).toEqual([0x00, 0xf8, 0xe0, 0x07]);
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

  test('encodes an I8 palette and pixel indices as an LVGL LZ4 block', () => {
    const result = encodePro2Wallpaper({
      width: 2,
      height: 1,
      rgba: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
      encoding: 'i8-lz4',
    });

    expect(result.colorFormat).toBe('I8');
    expect(Array.from(result.data.slice(0, 12))).toEqual([
      0x19, 0x0a, 0x08, 0, 2, 0, 1, 0, 2, 0, 0, 0,
    ]);
    const view = new DataView(result.data.buffer, result.data.byteOffset, result.data.byteLength);
    expect(view.getUint32(12, true)).toBe(2);
    expect(view.getUint32(16, true)).toBe(result.data.byteLength - 24);
    expect(view.getUint32(20, true)).toBe(1026);

    const rawData = decodeLz4Block(result.data.slice(24), 1026);
    expect(Array.from(rawData.slice(210 * 4, 210 * 4 + 4))).toEqual([0, 0, 255, 255]);
    expect(Array.from(rawData.slice(36 * 4, 36 * 4 + 4))).toEqual([0, 255, 0, 255]);
    expect(Array.from(rawData.slice(-2))).toEqual([210, 36]);
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
