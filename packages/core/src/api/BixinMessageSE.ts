import { BixinMessageSE as HardwareBixinMessageSE } from '@onekeyfe/hd-transport';

import { BaseMethod } from './BaseMethod';

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
