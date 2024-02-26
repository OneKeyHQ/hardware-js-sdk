import { DebugLinkStop as HardwareDebugLinkStop } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkStop extends BaseMethod<HardwareDebugLinkStop> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      wait_word_list: this.payload.wait_word_list,
      wait_word_pos: this.payload.wait_word_pos,
      wait_layout: this.payload.wait_layout,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkGetState',
      'DebugLinkState',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
