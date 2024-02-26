import { DebugLinkDecision as HardwareDebugLinkDecision } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkDecision extends BaseMethod<HardwareDebugLinkDecision> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      yes_no: this.payload.yes_no,
      swipe: this.payload.swipe,
      input: this.payload.input,
      x: this.payload.x,
      y: this.payload.y,
      wait: this.payload.wait,
      hold_ms: this.payload.hold_ms,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('DebugLinkDecision', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
