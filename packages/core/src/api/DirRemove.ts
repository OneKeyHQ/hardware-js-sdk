import { BaseMethod } from './BaseMethod';
import { validateProtocolV2FilesystemPath } from './helpers/filesystemValidation';

export type DirRemoveParams = {
  path: string;
};

export default class DirRemove extends BaseMethod<DirRemoveParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: validateProtocolV2FilesystemPath(this.payload.path, 'path') };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemDirRemove', 'Success', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
