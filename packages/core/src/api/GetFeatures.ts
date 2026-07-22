import { ERRORS, HardwareErrorCode, createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { projectFeatures } from '../device/DeviceStateProjector';
import { BaseMethod } from './BaseMethod';

export default class GetFeatures extends BaseMethod {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (this.payload?.detectBootloaderDevice && this.device.isBootloader()) {
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceDetectInBootloaderMode));
    }
    if (this.device.isProtocolV2()) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }
    const state = await this.device.getDeviceState({
      refresh: ['identity'],
      includeRaw: true,
    });
    return projectFeatures(state);
  }
}
