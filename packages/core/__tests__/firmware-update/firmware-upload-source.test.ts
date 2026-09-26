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
  it('serves a fixed-size request at the end of a bootloader artifact', async () => {
    const bytes = new Uint8Array(259072);
    bytes.fill(0xab);
    const source = await openFirmwareByteSource({ binary: bytes.buffer });
    if (!source) {
      throw new Error('Expected a firmware byte source');
    }

    const ackChunks: string[] = [];
    const typedCall = jest.fn(
      (type: string, _expected: unknown, params: { data_chunk?: string }) => {
        if (type === 'ResourceUpdate') {
          return Promise.resolve({
            type: 'ResourceRequest',
            message: { offset: 245760, data_length: 16 * 1024 },
          });
        }
        if (type === 'ResourceAck') {
          ackChunks.push(params.data_chunk ?? '');
          return Promise.resolve({
            type: 'Success',
            message: { message: 'updated' },
          });
        }
        return Promise.reject(new Error(`Unexpected command: ${type}`));
      }
    );

    await expect(
      updateResourceFromSource(typedCall as never, 'bootloader.bin', source)
    ).resolves.toEqual({ message: 'updated' });
    expect(ackChunks).toEqual(['ab'.repeat(13312)]);
    await source.close();
  });
});
