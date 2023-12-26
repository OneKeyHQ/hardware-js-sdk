import { DebugLinkMemoryWrite as HardwareDebugLinkMemoryWrite } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkMemoryWrite extends BaseMethod<HardwareDebugLinkMemoryWrite> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      address: this.payload.address,
      memory: this.payload.memory,
      flash: this.payload.flash,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkMemoryWrite',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
