import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

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

  run(): Promise<never> {
    return Promise.reject(
      createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType())
    );
  }
}
