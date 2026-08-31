/* eslint-disable no-bitwise -- LZ4 decoding and deterministic test data generation require bitwise operations. */
import { sha3_512 } from '@noble/hashes/sha3';

import {
  buildPro2HostAssetPackage,
  supportsPro2HostAssetPackage,
} from '../src/utils/pro2HostAssetPackage';

const decodeRawLz4Block = (compressed: Uint8Array, expectedLength: number) => {
  const output = new Uint8Array(expectedLength);
  let inputOffset = 0;
  let outputOffset = 0;

  const readLength = (initialLength: number) => {
    let length = initialLength;
    if (length === 15) {
      let extension = 255;
      while (extension === 255) {
        extension = compressed[inputOffset];
        inputOffset += 1;
        length += extension;
      }
    }
    return length;
  };

  while (inputOffset < compressed.byteLength) {
    const token = compressed[inputOffset];
    inputOffset += 1;
    const literalLength = readLength(token >>> 4);
    output.set(compressed.subarray(inputOffset, inputOffset + literalLength), outputOffset);
    inputOffset += literalLength;
    outputOffset += literalLength;
    if (inputOffset >= compressed.byteLength) break;

    const matchOffset = compressed[inputOffset] | (compressed[inputOffset + 1] << 8);
    inputOffset += 2;
    const matchLength = readLength(token & 0x0f) + 4;
    for (let index = 0; index < matchLength; index += 1) {
      output[outputOffset] = output[outputOffset - matchOffset];
      outputOffset += 1;
    }
  }

  expect(outputOffset).toBe(expectedLength);
  return output;
};

const decodeFirstPackageEntry = (packageData: Uint8Array, rawLength: number) => {
  const containerHeaderSize = 0x5f90;
  const archive = packageData.subarray(containerHeaderSize);
  const archiveView = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const compressedOffset = archiveView.getUint32(42 + 0x100, true);
  const compressed = archive.subarray(compressedOffset);
  const compressedView = new DataView(
    compressed.buffer,
    compressed.byteOffset,
    compressed.byteLength
  );
  const blockCount = compressedView.getUint16(0, true);
  const blockSize = 1 << compressedView.getUint16(2, true);
  let blockOffset = 8 + blockCount * 4;
  const decodedBlocks: Uint8Array[] = [];

  for (let index = 0; index < blockCount; index += 1) {
    const compressedLength = compressedView.getUint32(8 + index * 4, true);
    const expectedLength = Math.min(blockSize, rawLength - index * blockSize);
    decodedBlocks.push(
      decodeRawLz4Block(
        compressed.subarray(blockOffset, blockOffset + compressedLength),
        expectedLength
      )
    );
    blockOffset += compressedLength;
  }

  const decoded = new Uint8Array(rawLength);
  decodedBlocks.reduce((offset, block) => {
    decoded.set(block, offset);
    return offset + block.byteLength;
  }, 0);
  return decoded;
};

describe('Pro2 host asset package', () => {
  test('builds the unsigned RESOURCE container and LZ4-blocked archive expected by firmware', () => {
    const raw = new TextEncoder().encode('123456789');
    const packageData = buildPro2HostAssetPackage([{ name: 'wallpaper.bin', data: raw }]);
    const headerSize = 0x5f90;
    const payload = packageData.subarray(headerSize);
    const packageView = new DataView(
      packageData.buffer,
      packageData.byteOffset,
      packageData.byteLength
    );

    expect(packageView.getUint32(0, true)).toBe(0x50504b4f);
    expect(packageView.getUint32(4, true)).toBe(1);
    expect(packageView.getUint32(8, true)).toBe(0x43534552);
    expect(packageView.getUint32(0x0c, true)).toBe(headerSize);
    expect(packageView.getUint32(0x10, true)).toBe(1);
    expect(packageView.getUint32(0x14, true)).toBe(payload.byteLength);
    expect(packageData.subarray(0x200, 0x240)).toEqual(sha3_512(payload));
    expect(packageData.subarray(0x240, 0x280)).toEqual(sha3_512(packageData.subarray(0, 0x240)));
    expect(packageData[0x400]).toBe(0);
    expect(packageView.getUint32(0x408, true)).toBe(0x71717171);

    const archiveView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    expect(archiveView.getUint32(0, true)).toBe(0x52414b4f);
    expect(archiveView.getUint32(4, true)).toBe(1);
    expect(archiveView.getUint16(8, true)).toBe(1);
    expect(new TextDecoder().decode(payload.subarray(43, 56))).toBe('wallpaper.bin');
    expect(archiveView.getUint32(42 + 0x100, true)).toBe(340);
    expect(archiveView.getUint32(42 + 0x104, true)).toBe(raw.byteLength);
    expect(archiveView.getUint32(42 + 0x10c, true)).toBe(0xcbf43926);
    expect(payload[42 + 0x114]).toBe(1);

    const compressedOffset = archiveView.getUint32(42 + 0x100, true);
    expect(archiveView.getUint16(compressedOffset, true)).toBe(1);
    expect(archiveView.getUint16(compressedOffset + 2, true)).toBe(14);
    expect(archiveView.getUint32(compressedOffset + 4, true)).toBe(0);
    expect(archiveView.getUint32(compressedOffset + 8, true)).toBe(10);
    expect(payload.subarray(compressedOffset + 12)).toEqual(new Uint8Array([0x90, ...raw]));
  });

  test('round-trips multi-block data byte-for-byte with best-match compression', () => {
    const raw = Uint8Array.from({ length: 16_384 * 3 + 137 }, (_, index) => {
      const column = index % 604;
      const row = Math.floor(index / 604);
      return (column * 31 + row * 17) & 0xff;
    });

    const packageData = buildPro2HostAssetPackage([{ name: 'wallpaper.bin', data: raw }]);

    expect(decodeFirstPackageEntry(packageData, raw.byteLength)).toEqual(raw);
  });

  test('falls back to 8 KiB blocks when a compressed 16 KiB block exceeds firmware capacity', () => {
    let state = 0x12345678;
    const raw = Uint8Array.from({ length: 16_384 }, () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state & 0xff;
    });

    const packageData = buildPro2HostAssetPackage([{ name: 'wallpaper.bin', data: raw }]);
    const archive = packageData.subarray(0x5f90);
    const archiveView = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const compressedOffset = archiveView.getUint32(42 + 0x100, true);

    expect(archiveView.getUint16(compressedOffset + 2, true)).toBe(13);
    expect(decodeFirstPackageEntry(packageData, raw.byteLength)).toEqual(raw);
  });

  test.each([
    ['1.0.0', false],
    ['1.0.1-beta.1', false],
    ['1.0.1', true],
    ['1.1.0', true],
    [undefined, false],
  ])('selects package uploads for firmware %s', (firmwareVersion, expected) => {
    expect(supportsPro2HostAssetPackage(firmwareVersion)).toBe(expected);
  });
});
