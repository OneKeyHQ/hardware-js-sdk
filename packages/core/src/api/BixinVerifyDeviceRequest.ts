import { BixinVerifyDeviceRequest as HardwareBixinVerifyDeviceRequest } from '@onekeyfe/hd-transport';

import { BaseMethod } from './BaseMethod';

export default class BixinVerifyDeviceRequest extends BaseMethod<HardwareBixinVerifyDeviceRequest> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;

    // init params
    this.params = {
      data: this.payload.data,
    };
  }

  async run() {
    return this.device.commands.typedCall('BixinVerifyDeviceRequest', 'BixinVerifyDeviceAck', {
      ...this.params,
    });
  }
}
