import { BaseMethod } from './BaseMethod';

export type FileReadParams = {
  path: string;
  offset: number;
  totalSize: number;
  chunkLen?: number;
};

export default class FileRead extends BaseMethod<FileReadParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: this.payload.path,
      offset: this.payload.offset ?? 0,
      totalSize: this.payload.totalSize ?? 0,
      chunkLen: this.payload.chunkLen,
    };
  }

  async run() {
    const res = await (this.device.commands as any).call('FilesystemFileRead', {
      file: {
        path: this.params.path,
        offset: this.params.offset,
        total_size: this.params.totalSize,
      },
      chunk_len: this.params.chunkLen,
    });
    return Promise.resolve(res.message);
  }
}
