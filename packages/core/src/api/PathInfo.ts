import { BaseMethod } from './BaseMethod';
import {
  validateNonEmptyString,
  validateOptionalNonNegativeInteger,
} from './helpers/filesystemValidation';

export type PathInfoParams = {
  path: string;
  timeoutMs?: number | string;
};

export default class PathInfo extends BaseMethod<PathInfoParams> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: validateNonEmptyString(this.payload.path, 'path'),
      timeoutMs: validateOptionalNonNegativeInteger(this.payload.timeoutMs, 'timeoutMs'),
    };
  }

  async run() {
    const timeoutMs =
      this.params.timeoutMs === undefined ? undefined : Number(this.params.timeoutMs);
    const res = await this.device.commands.typedCall(
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      {
        path: this.params.path,
      },
      {
        timeoutMs,
      }
    );
    return Promise.resolve(res.message);
  }
}
