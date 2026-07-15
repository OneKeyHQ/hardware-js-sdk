import { BaseMethod } from '../BaseMethod';

export default class DeviceSessionGet extends BaseMethod {
  init() {
    this.requireProtocolV2 = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = undefined;
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'DeviceSessionGet',
      'DeviceSession',
      {}
    );
    return message;
  }
}
