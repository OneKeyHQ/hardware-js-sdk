import { BaseMethod } from './BaseMethod';
import {
  validateNonEmptyString,
  validateOptionalNonNegativeInteger,
} from './helpers/filesystemValidation';

export type DirListParams = {
  path: string;
  depth?: number;
};

export default class DirList extends BaseMethod<DirListParams> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: validateNonEmptyString(this.payload.path, 'path'),
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
