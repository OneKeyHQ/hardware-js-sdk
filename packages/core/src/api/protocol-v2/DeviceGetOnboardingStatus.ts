import { BaseMethod } from '../BaseMethod';

export default class DeviceGetOnboardingStatus extends BaseMethod {
  init() {
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'DevGetOnboardingStatus',
      'DevOnboardingStatus',
      {}
    );
    return message;
  }
}
