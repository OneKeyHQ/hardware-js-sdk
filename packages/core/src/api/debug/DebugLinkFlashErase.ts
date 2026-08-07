import { BaseMethod } from '../BaseMethod';

import type { DebugLinkFlashErase as HardwareDebugLinkFlashErase } from '@onekeyfe/hd-transport';

export default class DebugLinkFlashErase extends BaseMethod<HardwareDebugLinkFlashErase> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      sector: this.payload.sector,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkFlashErase',
      'DebugLinkLayout',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
