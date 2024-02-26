import { DebugLinkWatchLayout as HardwareDebugLinkWatchLayout } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkWatchLayout extends BaseMethod<HardwareDebugLinkWatchLayout> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      watch: this.payload.watch,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkWatchLayout',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
