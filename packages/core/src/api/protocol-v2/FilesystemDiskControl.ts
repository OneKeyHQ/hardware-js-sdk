import { BaseMethod } from '../BaseMethod';
import {
  validateNonNegativeInteger,
  validateOptionalNonNegativeInteger,
} from '../helpers/filesystemValidation';

export type FilesystemDiskControlParams = {
  enable?: number | string;
  timeoutMs?: number | string;
};

export default class FilesystemDiskControl extends BaseMethod<FilesystemDiskControlParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      enable: validateNonNegativeInteger(this.payload.enable, 'enable', 0),
      timeoutMs: validateOptionalNonNegativeInteger(this.payload.timeoutMs, 'timeoutMs'),
    };
  }

  async run() {
    const timeoutMs = Number(this.params.timeoutMs);
    const res = await this.device.commands.typedCall(
      'FilesystemDiskControl',
      'Success',
      {
        enable: Number(this.params.enable ?? 0),
      },
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : undefined
    );
    return Promise.resolve(res.message);
  }
}
