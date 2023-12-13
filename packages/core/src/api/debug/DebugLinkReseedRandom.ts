import { DebugLinkReseedRandom as HardwareDebugLinkReseedRandom } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkReseedRandom extends BaseMethod<HardwareDebugLinkReseedRandom> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      value: this.payload.value,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkReseedRandom',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
