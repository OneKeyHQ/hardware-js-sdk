import {
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import { hexToBytes, isHexString, stripHexPrefix } from './helpers/hexUtils';
import { DataManager } from '../data-manager';

export type FileReadParams = {
  path: string;
  offset?: number;
  totalSize?: number;
  chunkLen?: number;
  uiPercentage?: number;
};

const MIN_FILE_READ_CHUNK_SIZE = 64;

function getProtocolV2FileReadChunkLimit() {
  const env = DataManager.getSettings('env');
  if (env && DataManager.isBleConnect(env)) {
    return PROTOCOL_V2_BLE_FILE_CHUNK_SIZE;
  }
  return PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
}

function normalizeChunkSize(value: unknown, maxChunkSize: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return maxChunkSize;
  return Math.min(Math.max(Math.floor(numeric), MIN_FILE_READ_CHUNK_SIZE), maxChunkSize);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (value && typeof value === 'object') {
    const longLike = value as { toNumber?: () => number };
    if (typeof longLike.toNumber === 'function') {
      const numeric = longLike.toNumber();
      return Number.isFinite(numeric) ? numeric : undefined;
    }
  }
  return undefined;
}

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') {
    const hex = stripHexPrefix(value);
    if (!hex) return new Uint8Array(0);
    if (!isHexString(hex) || hex.length % 2 !== 0) return new Uint8Array(0);
    return hexToBytes(hex);
  }
  return new Uint8Array(0);
}

export default class FileRead extends BaseMethod<FileReadParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: this.payload.path,
      offset: this.payload.offset ?? 0,
      totalSize: this.payload.totalSize ?? 0,
      chunkLen: this.payload.chunkLen,
      uiPercentage: this.payload.uiPercentage,
    };
  }

  async run() {
    const startOffset = this.params.offset ?? 0;
    const requestedLength = Number(this.params.totalSize);
    const chunkSize = normalizeChunkSize(
      this.params.chunkLen,
      getProtocolV2FileReadChunkLimit()
    );
    let totalLength = Number.isFinite(requestedLength) && requestedLength > 0 ? requestedLength : 0;

    if (totalLength === 0) {
      const pathInfoRes = await this.device.commands.typedCall(
        'FilesystemPathInfoQuery',
        'FilesystemPathInfo',
        {
          path: this.params.path,
        }
      );
      const fileSize = toFiniteNumber(pathInfoRes.message?.size);
      if (!pathInfoRes.message?.exist || pathInfoRes.message?.directory) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `FilesystemFileRead path is not a file: ${this.params.path}`
        );
      }
      if (fileSize === undefined || fileSize < startOffset) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `FilesystemFileRead invalid offset ${startOffset} for ${this.params.path}`
        );
      }
      totalLength = fileSize - startOffset;
    }

    const chunks: Uint8Array[] = [];
    let read = 0;
    let lastMessage: Record<string, unknown> | undefined;

    while (read < totalLength) {
      const readLen = Math.min(chunkSize, totalLength - read);
      const offset = startOffset + read;
      const progress =
        this.params.uiPercentage ??
        Math.min(Math.ceil(((read + readLen) / Math.max(totalLength, 1)) * 100), 99);
      const res = await this.device.commands.typedCall('FilesystemFileRead', 'FilesystemFile', {
        file: {
          path: this.params.path,
          offset,
          total_size: 0,
        },
        chunk_len: readLen,
        ui_percentage: progress,
      });
      const data = toUint8Array(res.message?.data);
      lastMessage = res.message;

      if (data.byteLength === 0) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `FilesystemFileRead received empty data at offset ${offset}`
        );
      }

      chunks.push(data);
      read += data.byteLength;
    }

    const combined = new Uint8Array(read);
    let cursor = 0;
    chunks.forEach(chunk => {
      combined.set(chunk, cursor);
      cursor += chunk.byteLength;
    });

    return Promise.resolve({
      ...lastMessage,
      path: this.params.path,
      offset: startOffset,
      total_size: totalLength,
      data: combined,
      chunks: chunks.length,
    });
  }
}
