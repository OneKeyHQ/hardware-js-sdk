import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

export default class GetFeatures extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [
      ...this.notAllowDeviceMode,
      UI_REQUEST.INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  run() {
    if (this.payload.detectBootloaderDevice && this.device.features?.bootloader_mode) {
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceDetectInBootloaderMode));
    }
    return Promise.resolve(this.device.features);
  }
}
