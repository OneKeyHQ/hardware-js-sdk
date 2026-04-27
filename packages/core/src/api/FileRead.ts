import { BaseMethod } from './BaseMethod';

export type FileReadParams = {
  path: string;
  offset: number;
  totalSize: number;
};

export default class FileRead extends BaseMethod<FileReadParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: this.payload.path,
      offset: this.payload.offset ?? 0,
      totalSize: this.payload.totalSize ?? 0,
    };
  }

  async run() {
    const res = await (this.device.commands as any).call('FileRead', {
      file: {
        path: this.params.path,
        offset: this.params.offset,
        total_size: this.params.totalSize,
      },
    });
    return Promise.resolve(res.message);
  }
}
