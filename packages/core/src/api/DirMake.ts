import { BaseMethod } from './BaseMethod';
import { validateNonEmptyString } from './helpers/filesystemValidation';

export type DirMakeParams = {
  path: string;
};

export default class DirMake extends BaseMethod<DirMakeParams> {
  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: validateNonEmptyString(this.payload.path, 'path') };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemDirMake', 'Success', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
