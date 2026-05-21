import { BaseMethod } from './BaseMethod';
import { validateNonEmptyString } from './helpers/filesystemValidation';

export type FileDeleteParams = {
  path: string;
};

export default class FileDelete extends BaseMethod<FileDeleteParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: validateNonEmptyString(this.payload.path, 'path') };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemFileDelete', 'Success', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
