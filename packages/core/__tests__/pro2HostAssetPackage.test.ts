import { sha3_512 } from '@noble/hashes/sha3';

import {
  buildPro2HostAssetPackage,
  supportsPro2HostAssetPackage,
} from '../src/utils/pro2HostAssetPackage';

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
    expect(archiveView.getUint16(compressedOffset + 2, true)).toBe(12);
    expect(archiveView.getUint32(compressedOffset + 4, true)).toBe(0);
    expect(archiveView.getUint32(compressedOffset + 8, true)).toBe(10);
    expect(payload.subarray(compressedOffset + 12)).toEqual(new Uint8Array([0x90, ...raw]));
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
