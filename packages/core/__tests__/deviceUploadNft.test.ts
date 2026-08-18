import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';
import { encode as encodeJpeg } from 'jpeg-js';

import DeviceUploadNft from '../src/api/protocol-v2/DeviceUploadNft';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createRgba = (width: number, height: number) => {
  const data = new Uint8Array(width * height * 4);
  for (let index = 3; index < data.length; index += 4) data[index] = 0xff;
  return data;
};

const jpegBase64Cache = new Map<string, string>();

const createJpegBase64 = (width: number, height: number) => {
  const key = `${width}x${height}`;
  const cached = jpegBase64Cache.get(key);
  if (cached) return cached;
  const value = encodeJpeg({ width, height, data: createRgba(width, height) }, 80).data.toString(
    'base64'
  );
  jpegBase64Cache.set(key, value);
  return value;
};

const createMethod = ({
  typedCall,
  supportedMessages = [60802, 60805, 60808, 61500],
  useFullBundle = false,
}: {
  typedCall: jest.Mock;
  supportedMessages?: number[];
  useFullBundle?: boolean;
}) => {
  const method = new DeviceUploadNft({
    id: 1,
    payload: {
      method: 'deviceUploadNft',
      imageJpegBase64: createJpegBase64(540, 540),
      thumbnailJpegBase64: createJpegBase64(263, 263),
      title: 'CryptoPunk #3100',
      subtitle: 'CryptoPunks',
      timestampMs: 1_760_000_000_000,
      chunkSize: 2048,
      paceMs: 0,
    },
  });
  (method as any).device = {
    commands: { typedCall },
    ensureProtocolV2RuntimeContext: jest.fn(() =>
      Promise.resolve({
        version: 2,
        build_fingerprint: 'application__1.0.0__test__DEV__DEBUG',
        supported_messages: supportedMessages,
      })
    ),
    getCurrentFirmwareType: jest.fn(),
  };
  method.postMessage = jest.fn();

  if (useFullBundle) {
    method.init();
  } else {
    (method as any).params = { chunkSize: 2048, paceMs: 0, timeoutMs: 15_000 };
    (method as any).bundle = {
      basename: 'nft-deadbeef-1760000000000',
      image: new Uint8Array([1]),
      thumbnail: new Uint8Array([2]),
      metadata: new TextEncoder().encode('{"title":"NFT","subtitle":""}'),
    };
  }

  return method;
};

const fileWriteSuccess = (params: { file: { offset: number; data: Uint8Array } }) => ({
  message: {
    processed_byte: params.file.offset + params.file.data.byteLength,
  },
});

const nftFileList = (count: number, basenameAt?: number) =>
  Array.from({ length: count }, (_, index) => {
    const basename =
      index === basenameAt
        ? 'nft-deadbeef-1760000000000'
        : `nft-${index.toString(16).padStart(8, '0')}-${1760000000001 + index}`;
    return [`${basename}.bin`, `${basename}_m.bin`, `${basename}.json`];
  })
    .flat()
    .join('\n');

describe('DeviceUploadNft', () => {
  test('defaults to maximum-size chunks without artificial pacing', () => {
    const method = new DeviceUploadNft({
      id: 1,
      payload: {
        method: 'deviceUploadNft',
        imageJpegBase64: createJpegBase64(540, 540),
        thumbnailJpegBase64: createJpegBase64(263, 263),
        title: 'CryptoPunk #3100',
        subtitle: 'CryptoPunks',
        timestampMs: 1_760_000_000_000,
      },
    });

    method.init();

    expect(method.unlockPolicy).toBe('unlock-before-run');
    expect(method.protocolV2PreUnlockPinType).toBe(DeviceSessionPinType.Any);
    expect((method as any).params).toMatchObject({
      chunkSize: 2048,
      paceMs: 0,
    });
  });

  test('rejects invalid image Base64 before device communication', () => {
    const method = new DeviceUploadNft({
      id: 1,
      payload: {
        method: 'deviceUploadNft',
        imageJpegBase64: 'not-base64',
        thumbnailJpegBase64: createJpegBase64(263, 263),
        title: 'NFT',
        subtitle: '',
      },
    });

    expect(() => method.init()).toThrow('canonical Base64');
  });

  test('uploads the triplet in order without creating the firmware-owned directory', async () => {
    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return { message: { path: 'vol1:/nft', child_files: '' } };
      }
      if (request === 'FilesystemFileWrite') return fileWriteSuccess(params);
      if (request === 'NftUpdate') return { message: { message: 'NFT updated' } };
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall, useFullBundle: true });

    const result = await method.run();

    const requests = typedCall.mock.calls.map(call => call[0]);
    expect(requests[0]).toBe('FilesystemPathInfoQuery');
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      { path: 'vol1:/nft' },
      { timeoutMs: 15_000 }
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'FilesystemDirList',
      'FilesystemDir',
      { path: 'vol1:/nft', depth: 1 },
      { timeoutMs: 15_000 }
    );
    expect(requests).not.toContain('FilesystemDirMake');
    expect(requests.at(-1)).toBe('NftUpdate');
    const fileWrites = typedCall.mock.calls.filter(call => call[0] === 'FilesystemFileWrite');
    const paths = fileWrites.map(call => call[2].file.path as string);
    const imagePath = paths[0];
    const thumbnailStart = paths.findIndex(path => path.endsWith('_m.bin'));
    const metadataStart = paths.findIndex(path => path.endsWith('.json'));
    expect(imagePath).toMatch(/^vol1:\/nft\/nft-[a-f0-9]{8}-1760000000000\.bin$/);
    expect(thumbnailStart).toBeGreaterThan(0);
    expect(metadataStart).toBeGreaterThan(thumbnailStart);
    expect(new Set(paths.slice(0, thumbnailStart))).toEqual(new Set([imagePath]));
    expect(new Set(paths.slice(thumbnailStart, metadataStart))).toEqual(
      new Set([result.thumbnailPath])
    );
    expect(typedCall).toHaveBeenLastCalledWith(
      'NftUpdate',
      'Success',
      { file_name_no_ext: result.basename },
      { timeoutMs: 15_000 }
    );
    expect(result).toMatchObject({
      nftUpdated: true,
      message: 'NFT updated',
      totalSize: 583_212 + 138_876 + 53,
    });
    expect(method.postMessage).toHaveBeenLastCalledWith({
      event: 'UI_EVENT',
      type: 'ui-device_progress',
      payload: expect.objectContaining({
        progress: 100,
        transferredBytes: result.totalSize,
        totalBytes: result.totalSize,
      }),
    });
  });

  test('treats a missing NFT directory as empty before the first upload', async () => {
    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: false, directory: false } };
      }
      if (request === 'FilesystemFileWrite') return fileWriteSuccess(params);
      if (request === 'NftUpdate') return { message: { message: 'NFT updated' } };
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).resolves.toMatchObject({ nftUpdated: true });
    expect(typedCall.mock.calls.map(call => call[0])).not.toContain('FilesystemDirList');
    expect(typedCall.mock.calls.some(call => call[0] === 'FilesystemFileWrite')).toBe(true);
  });

  test('does not retry a timed-out NftUpdate', async () => {
    const timeout = Object.assign(new Error('Protocol V2 response timeout'), {
      code: 'response-timeout',
    });
    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return { message: { path: 'vol1:/nft', child_files: '' } };
      }
      if (request === 'FilesystemFileWrite') return fileWriteSuccess(params);
      if (request === 'NftUpdate') throw timeout;
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).rejects.toBe(timeout);

    const updateRequests = typedCall.mock.calls.filter(call => call[0] === 'NftUpdate');
    expect(updateRequests).toHaveLength(1);
  });

  test('does not retry a non-timeout NftUpdate failure', async () => {
    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return { message: { path: 'vol1:/nft', child_files: '' } };
      }
      if (request === 'FilesystemFileWrite') return fileWriteSuccess(params);
      if (request === 'NftUpdate') throw new Error('Invalid NFT metadata');
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).rejects.toThrow('Invalid NFT metadata');
    expect(typedCall.mock.calls.filter(call => call[0] === 'NftUpdate')).toHaveLength(1);
  });

  test('does not publish when a file write fails', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return { message: { path: 'vol1:/nft', child_files: '' } };
      }
      if (request === 'FilesystemFileWrite') throw new Error('Filesystem full');
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).rejects.toThrow('Filesystem full');
    expect(typedCall.mock.calls.some(call => call[0] === 'NftUpdate')).toBe(false);
  });

  test('rejects unsupported firmware before writing files', async () => {
    const typedCall = jest.fn();
    const method = createMethod({ typedCall, supportedMessages: [60805] });

    await expect(method.run()).rejects.toBeDefined();
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('rejects a new NFT before writing when ten complete NFT bundles exist', async () => {
    const typedCall = jest.fn((request: string) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return { message: { path: 'vol1:/nft', child_files: nftFileList(10) } };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.NftStorageLimitReached,
      params: { count: 10, limit: 10 },
    });
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'FilesystemPathInfoQuery',
      'FilesystemDirList',
    ]);
  });

  test('allows an idempotent retry for a basename already counted at the limit', async () => {
    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return { message: { path: 'vol1:/nft', child_files: nftFileList(10, 0) } };
      }
      if (request === 'FilesystemFileWrite') return fileWriteSuccess(params);
      if (request === 'NftUpdate') return { message: {} };
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).resolves.toMatchObject({ nftUpdated: true });
    expect(typedCall.mock.calls.some(call => call[0] === 'FilesystemFileWrite')).toBe(true);
  });

  test('does not count unrelated or incomplete files as stored NFTs', async () => {
    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'FilesystemPathInfoQuery') {
        return { message: { exist: true, directory: true } };
      }
      if (request === 'FilesystemDirList') {
        return {
          message: {
            path: 'vol1:/nft',
            child_files: `${nftFileList(9)}\nnft-ffffffff-1760000009999.json\nnotes.txt`,
          },
        };
      }
      if (request === 'FilesystemFileWrite') return fileWriteSuccess(params);
      if (request === 'NftUpdate') return { message: {} };
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = createMethod({ typedCall });

    await expect(method.run()).resolves.toMatchObject({ nftUpdated: true });
  });
});
