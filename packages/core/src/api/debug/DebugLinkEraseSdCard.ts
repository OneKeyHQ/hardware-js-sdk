import { DebugLinkEraseSdCard as HardwareDebugLinkEraseSdCard } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkEraseSdCard extends BaseMethod<HardwareDebugLinkEraseSdCard> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      format: this.payload.format,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkEraseSdCard',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
