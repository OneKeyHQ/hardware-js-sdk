import { EDeviceType } from '@onekeyfe/hd-shared';

import { openFirmwareByteSource } from '../../src/api/firmware/FirmwareArtifactSource';
import {
  updateResourceFromSource,
  uploadFirmwareFromSource,
} from '../../src/api/firmware/uploadFirmware';

import type { Device } from '../../src/device/Device';
import type { FirmwareByteSource } from '../../src/api/firmware/FirmwareArtifactSource';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('uploadFirmwareFromSource', () => {
  it('serves legacy Touch firmware requests without materializing the complete artifact', async () => {
    const size = 700 * 1024;
    const requestedRanges: Array<{ offset: number; length: number }> = [];
    const source: FirmwareByteSource = {
      size,
      readAt: jest.fn((offset: number, length: number) => {
        requestedRanges.push({ offset, length });
        return Promise.resolve(new ArrayBuffer(length));
      }),
      close: jest.fn(() => Promise.resolve()),
    };
    let nextOffset = 0;
    const requestedLength = 128 * 1024;
    const typedCall = jest.fn((type: string) => {
      if (type === 'FirmwareErase') {
        return Promise.resolve({
          type: 'FirmwareRequest',
          message: {
            offset: nextOffset,
            length: Math.min(requestedLength, size - nextOffset),
          },
        });
      }
      if (type === 'FirmwareUpload') {
        nextOffset += Math.min(requestedLength, size - nextOffset);
        if (nextOffset < size) {
          return Promise.resolve({
            type: 'FirmwareRequest',
            message: {
              offset: nextOffset,
              length: Math.min(requestedLength, size - nextOffset),
            },
          });
        }
        return Promise.resolve({
          type: 'Success',
          message: { message: 'installed' },
        });
      }
      return Promise.reject(new Error(`Unexpected command: ${type}`));
    });
    const device = {
      features: undefined,
      emit: jest.fn(),
      getCurrentDeviceType: () => EDeviceType.Touch,
      toMessageObject: () => ({}),
    } as unknown as Device;

    await expect(
      uploadFirmwareFromSource('firmware', typedCall as never, jest.fn(), device, source)
    ).resolves.toEqual({ message: 'installed' });

    expect(requestedRanges).toHaveLength(Math.ceil(size / requestedLength));
    expect(requestedRanges.every(({ length }) => length <= 256 * 1024)).toBe(true);
    expect(requestedRanges.some(({ length }) => length === size)).toBe(false);
  });
});

describe('updateResourceFromSource', () => {
  it('serves the remaining bytes when Touch requests a full final resource chunk', async () => {
    const chunkSize = 16 * 1024;
    const bytes = new Uint8Array(chunkSize * 2 + 3);
    bytes.fill(0x5a, chunkSize, chunkSize * 2);
    bytes.set([1, 2, 3], chunkSize * 2);
    const source = await openFirmwareByteSource({ binary: bytes.buffer });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }
    const readAt = jest.spyOn(source, 'readAt');
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'ResourceRequest',
        message: { offset: chunkSize, data_length: chunkSize },
      })
      .mockResolvedValueOnce({
        type: 'ResourceRequest',
        message: { offset: chunkSize * 2, data_length: chunkSize },
      })
      .mockResolvedValueOnce({ type: 'Success', message: { message: 'updated' } });

    try {
      await expect(
        updateResourceFromSource(typedCall as never, 'icon.png', source)
      ).resolves.toEqual({ message: 'updated' });
      expect(typedCall).toHaveBeenCalledTimes(3);
      expect(readAt).toHaveBeenNthCalledWith(2, chunkSize, chunkSize);
      expect(readAt).toHaveBeenNthCalledWith(3, chunkSize * 2, 3);
      expect(typedCall).toHaveBeenNthCalledWith(
        2,
        'ResourceAck',
        ['ResourceRequest', 'Success'],
        expect.objectContaining({ data_chunk: '5a'.repeat(chunkSize) })
      );
      expect(typedCall).toHaveBeenNthCalledWith(
        3,
        'ResourceAck',
        ['ResourceRequest', 'Success'],
        expect.objectContaining({ data_chunk: '010203' })
      );
    } finally {
      await source.close();
    }
  });

  it('rejects a resource request starting beyond the last byte', async () => {
    const source = await openFirmwareByteSource({ binary: new Uint8Array(3).buffer });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'ResourceRequest',
      message: { offset: source.size, data_length: 16 * 1024 },
    });

    try {
      await expect(
        updateResourceFromSource(typedCall as never, 'icon.png', source)
      ).rejects.toThrow('Device requested an invalid firmware resource range');
      expect(typedCall).toHaveBeenCalledTimes(1);
    } finally {
      await source.close();
    }
  });
});
