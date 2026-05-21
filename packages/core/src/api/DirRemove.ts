import { BaseMethod } from './BaseMethod';
import { validateNonEmptyString } from './helpers/filesystemValidation';

export type DirRemoveParams = {
  path: string;
};

export default class DirRemove extends BaseMethod<DirRemoveParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: validateNonEmptyString(this.payload.path, 'path') };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemDirRemove', 'Success', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
