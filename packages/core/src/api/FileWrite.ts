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
    this.params = {
      path: this.payload.path,
      offset: this.payload.offset ?? 0,
      totalSize: this.payload.totalSize ?? 0,
      data: this.payload.data,
      overwrite: this.payload.overwrite ?? true,
      append: this.payload.append ?? false,
    };
  }

  async run() {
    const res = await (this.device.commands as any).call('FileWrite', {
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
