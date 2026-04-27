import { BaseMethod } from './BaseMethod';

export type FileDeleteParams = {
  path: string;
};

export default class FileDelete extends BaseMethod<FileDeleteParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: this.payload.path };
  }

  async run() {
    const res = await (this.device.commands as any).call('FileDelete', { path: this.params.path });
    return Promise.resolve(res.message);
  }
}
