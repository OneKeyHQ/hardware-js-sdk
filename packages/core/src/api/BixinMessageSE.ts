import { BaseMethod } from './BaseMethod';

import type { BixinMessageSE as HardwareBixinMessageSE } from '@onekeyfe/hd-transport';

export default class BixinMessageSE extends BaseMethod<HardwareBixinMessageSE> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;

    // init params
    this.params = {
      inputmessage: this.payload.inputmessage,
    };
  }

  async run() {
    return this.device.commands.typedCall('BixinMessageSE', 'BixinOutMessageSE', {
      ...this.params,
    });
  }
}
