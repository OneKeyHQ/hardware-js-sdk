import { BaseMethod } from './BaseMethod';
import { validateProtocolV2FilesystemPath } from './helpers/filesystemValidation';

export type FileDeleteParams = {
  path: string;
};

export default class FileDelete extends BaseMethod<FileDeleteParams> {
  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: validateProtocolV2FilesystemPath(this.payload.path, 'path') };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemFileDelete', 'Success', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
