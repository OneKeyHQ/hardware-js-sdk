import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import {
  invalidParameter,
  validateOptionalNonNegativeInteger,
} from '../helpers/filesystemValidation';

export type FilesystemDiskControlParams = {
  // 收紧为 boolean | 0 | 1；'0' / '1' 字符串仅作为历史输入向后兼容，内部归一化为 0/1
  enable?: boolean | 0 | 1;
  timeoutMs?: number | string;
};

function normalizeDiskControlEnable(value: unknown): 0 | 1 {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 0 || value === '0') return 0;
  if (value === 1 || value === '1') return 1;
  throw invalidParameter('Parameter [enable] must be a boolean or 0 | 1.');
}

export default class FilesystemDiskControl extends BaseMethod<{
  enable: 0 | 1;
  timeoutMs?: number;
}> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      enable: normalizeDiskControlEnable(this.payload.enable),
      timeoutMs: validateOptionalNonNegativeInteger(this.payload.timeoutMs, 'timeoutMs'),
    };
  }

  run(): Promise<never> {
    return Promise.reject(
      createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType())
    );
  }
}
