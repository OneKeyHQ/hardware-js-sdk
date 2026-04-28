import { BaseMethod } from './BaseMethod';

export type DirRemoveParams = {
  path: string;
};

export default class DirRemove extends BaseMethod<DirRemoveParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: this.payload.path };
  }

  async run() {
    const res = await (this.device.commands as any).call('FilesystemDirRemove', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
