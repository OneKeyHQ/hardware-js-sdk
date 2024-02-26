import { DebugLinkRecordScreen as HardwareDebugLinkRecordScreen } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DebugLinkRecordScreen extends BaseMethod<HardwareDebugLinkRecordScreen> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      target_directory: this.payload.target_directory,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DebugLinkRecordScreen',
      'Success',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
