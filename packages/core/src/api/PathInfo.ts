import { BaseMethod } from './BaseMethod';
import { validateNonEmptyString } from './helpers/filesystemValidation';

export type PathInfoParams = {
  path: string;
};

export default class PathInfo extends BaseMethod<PathInfoParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: validateNonEmptyString(this.payload.path, 'path') };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      {
        path: this.params.path,
      }
    );
    return Promise.resolve(res.message);
  }
}
