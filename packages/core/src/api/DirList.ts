import { BaseMethod } from './BaseMethod';

export type DirListParams = {
  path: string;
  depth?: number;
};

export default class DirList extends BaseMethod<DirListParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: this.payload.path,
      depth: this.payload.depth,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemDirList', 'FilesystemDir', {
      path: this.params.path,
      depth: this.params.depth,
    });
    return Promise.resolve(res.message);
  }
}
