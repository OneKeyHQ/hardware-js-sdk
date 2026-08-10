import { HardwareTopLevelSdk } from '../src';
import { findMethod } from '../src/api/utils';
import {
  decodeBridgeBinaryPayload,
  encodeBridgeBinaryPayload,
} from '../src/utils/bridgeBinaryPayload';

import type { LowLevelCoreApi } from '../src';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const crossJsonOnlyBridge = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('bridge binary payload', () => {
  test('preserves nested ArrayBuffer and sliced Uint8Array values', async () => {
    const arrayBuffer = new Uint8Array([1, 2, 3]).buffer;
    const backing = new Uint8Array([90, 4, 5, 6, 91]);
    const encoded = await encodeBridgeBinaryPayload({
      arrayBuffer,
      bytes: backing.subarray(1, 4),
    });
    const decoded = decodeBridgeBinaryPayload(crossJsonOnlyBridge(encoded)) as {
      arrayBuffer: ArrayBuffer;
      bytes: Uint8Array;
    };

    expect(decoded.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(decoded.arrayBuffer))).toEqual([1, 2, 3]);
    expect(decoded.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(decoded.bytes)).toEqual([4, 5, 6]);
  });

  test('encodes Blob input as byte data', async () => {
    const encoded = await encodeBridgeBinaryPayload(new Blob([new Uint8Array([7, 8])]));
    const decoded = decodeBridgeBinaryPayload(crossJsonOnlyBridge(encoded));

    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(Array.from(decoded as Uint8Array)).toEqual([7, 8]);
  });

  test('routes portfolio, wallpaper and NFT bytes through the top-level boundary', async () => {
    const restoredPayloads: Array<Record<string, any>> = [];
    const lowLevelApi = {
      call: jest.fn(params => {
        const wirePayload = crossJsonOnlyBridge(params);
        const method = findMethod({ id: 1, payload: wirePayload } as any);
        restoredPayloads.push(method.payload);
        return Promise.resolve({ success: true, payload: {} });
      }),
      init: jest.fn(() => Promise.resolve(true)),
    } as unknown as LowLevelCoreApi;
    const sdk = HardwareTopLevelSdk();
    await sdk.init({}, lowLevelApi);

    const portfolioBytes = new Uint8Array([1, 2, 3]).buffer;
    const wallpaperBacking = new Uint8Array([90, 4, 5, 6, 91]);
    const nftBacking = new Uint8Array([80, 7, 8, 9, 10, 81]);
    await sdk.uploadPortfolio('connect-id', { packageBytes: portfolioBytes });
    await sdk.deviceUploadWallpaper('connect-id', {
      width: 604,
      height: 1024,
      rgba: wallpaperBacking.subarray(1, 4),
    });
    await sdk.deviceUploadNft('connect-id', {
      image: { width: 540, height: 540, rgba: nftBacking.subarray(1, 3) },
      thumbnail: { width: 263, height: 263, rgba: nftBacking.subarray(3, 5) },
      title: 'NFT',
      subtitle: '',
    });

    expect(Array.from(new Uint8Array(restoredPayloads[0].packageBytes))).toEqual([1, 2, 3]);
    expect(Array.from(restoredPayloads[1].rgba)).toEqual([4, 5, 6]);
    expect(Array.from(restoredPayloads[2].image.rgba)).toEqual([7, 8]);
    expect(Array.from(restoredPayloads[2].thumbnail.rgba)).toEqual([9, 10]);
  });

  test('routes firmware update binaries through the top-level boundary', async () => {
    const restoredPayloads: Array<Record<string, any>> = [];
    const lowLevelApi = {
      call: jest.fn(params => {
        const wirePayload = crossJsonOnlyBridge(params);
        const method = findMethod({ id: 1, payload: wirePayload } as any);
        restoredPayloads.push(method.payload);
        return Promise.resolve({ success: true, payload: {} });
      }),
      init: jest.fn(() => Promise.resolve(true)),
    } as unknown as LowLevelCoreApi;
    const sdk = HardwareTopLevelSdk();
    await sdk.init({}, lowLevelApi);
    const binary = (...bytes: number[]) => Uint8Array.from(bytes).buffer;

    await sdk.firmwareUpdate('connect-id', {
      binary: binary(1),
      updateType: 'firmware',
    });
    await sdk.firmwareUpdateV2('connect-id', {
      binary: binary(2),
      updateType: 'firmware',
      platform: 'ext',
    });
    await sdk.firmwareUpdateV3('connect-id', {
      platform: 'ext',
      bleBinary: binary(3),
      firmwareBinary: binary(4),
      bootloaderBinary: binary(5),
      resourceBinary: binary(6),
    });
    await sdk.firmwareUpdateV4('connect-id', {
      platform: 'ext',
      targetsToUpdate: [
        'boot',
        'app_v1',
        'app_v2',
        'coprocessor',
        'se01',
        'se02',
        'se03',
        'se04',
        'resource',
      ],
      romloaderBinary: binary(7),
      bootloaderBinary: binary(8),
      applicationP1Binary: binary(9),
      applicationP2Binary: binary(10),
      coprocessorBinary: binary(11),
      se01Binary: binary(12),
      se02Binary: binary(13),
      se03Binary: binary(14),
      se04Binary: binary(15),
      resourceArchiveBinary: binary(16),
    });
    await sdk.deviceUpdateBootloader('connect-id', { binary: binary(17) });
    await sdk.deviceFullyUploadResource('connect-id', { binary: binary(18) });

    expect(restoredPayloads).toHaveLength(6);
    const restoredBinaries = [
      restoredPayloads[0].binary,
      restoredPayloads[1].binary,
      restoredPayloads[2].bleBinary,
      restoredPayloads[2].firmwareBinary,
      restoredPayloads[2].bootloaderBinary,
      restoredPayloads[2].resourceBinary,
      restoredPayloads[3].romloaderBinary,
      restoredPayloads[3].bootloaderBinary,
      restoredPayloads[3].applicationP1Binary,
      restoredPayloads[3].applicationP2Binary,
      restoredPayloads[3].coprocessorBinary,
      restoredPayloads[3].se01Binary,
      restoredPayloads[3].se02Binary,
      restoredPayloads[3].se03Binary,
      restoredPayloads[3].se04Binary,
      restoredPayloads[3].resourceArchiveBinary,
      restoredPayloads[4].binary,
      restoredPayloads[5].binary,
    ];
    expect(restoredBinaries.map(value => Array.from(new Uint8Array(value)))).toEqual(
      Array.from({ length: 18 }, (_, index) => [index + 1])
    );
  });

  test('rejects malformed tagged binary data', () => {
    expect(() =>
      decodeBridgeBinaryPayload({
        __onekey_hd_bridge_binary_payload__: 1,
        data: 'not-base64',
        type: 'uint8-array',
      })
    ).toThrow('Invalid bridge binary payload data');
  });
});
