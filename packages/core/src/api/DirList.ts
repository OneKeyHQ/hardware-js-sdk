import { BaseMethod } from './BaseMethod';
import {
  validateOptionalNonNegativeInteger,
  validateProtocolV2FilesystemPath,
} from './helpers/filesystemValidation';

export type DirListParams = {
  path: string;
  depth?: number;
};

export default class DirList extends BaseMethod<DirListParams> {
  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: validateProtocolV2FilesystemPath(this.payload.path, 'path', {
        allowVolumeRoot: true,
      }),
      depth: validateOptionalNonNegativeInteger(this.payload.depth, 'depth'),
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
