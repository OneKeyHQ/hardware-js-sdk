import { PROTOCOL_V2_FILE_CHUNK_SIZE } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';

export type FileWriteParams = {
  path: string;
  offset: number;
  totalSize: number;
  data: Uint8Array | string;
  overwrite?: boolean;
  append?: boolean;
};

export default class FileWrite extends BaseMethod<FileWriteParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    const offset = this.payload.offset ?? 0;
    this.params = {
      path: this.payload.path,
      offset,
      totalSize: this.payload.totalSize ?? 0,
      data: this.payload.data,
      overwrite: this.payload.overwrite ?? offset === 0,
      append: this.payload.append ?? offset !== 0,
    };
  }

  async run() {
    const dataLength =
      typeof this.params.data === 'string'
        ? Buffer.byteLength(this.params.data, 'utf8')
        : this.params.data.byteLength;
    if (dataLength > PROTOCOL_V2_FILE_CHUNK_SIZE) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite data too large: ${dataLength} bytes`
      );
    }
    if (this.params.totalSize < this.params.offset + dataLength) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite totalSize ${
          this.params.totalSize
        } is smaller than offset + data length ${this.params.offset + dataLength}`
      );
    }

    const res = await (this.device.commands as any).call('FilesystemFileWrite', {
      file: {
        path: this.params.path,
        offset: this.params.offset,
        total_size: this.params.totalSize,
        data: this.params.data,
      },
      overwrite: this.params.overwrite,
      append: this.params.append,
    });
    return Promise.resolve(res.message);
  }
}
