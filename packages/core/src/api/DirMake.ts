import { BaseMethod } from './BaseMethod';

export type DirMakeParams = {
  path: string;
};

export default class DirMake extends BaseMethod<DirMakeParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: this.payload.path };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemDirMake', 'Success', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
