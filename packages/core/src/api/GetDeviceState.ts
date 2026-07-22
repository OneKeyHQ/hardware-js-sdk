import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

import type { GetDeviceStateParams } from '../types/api/getDeviceState';

export default class GetDeviceState extends BaseMethod<GetDeviceStateParams> {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      refresh: Array.isArray(this.payload.refresh) ? this.payload.refresh : [],
      includeRaw: this.payload.includeRaw === true,
    };
  }

  async run() {
    return this.device.getDeviceState(this.params);
  }
}
