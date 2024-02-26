import { DebugLinkGetState as HardwareDebugLinkGetState } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkGetState extends BaseMethod<HardwareDebugLinkGetState> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {};
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkGetState',
      'DebugLinkLog',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
