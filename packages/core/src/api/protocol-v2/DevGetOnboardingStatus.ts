import { BaseMethod } from '../BaseMethod';

export default class DevGetOnboardingStatus extends BaseMethod {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DevGetOnboardingStatus',
      'DevOnboardingStatus',
      {}
    );
    return Promise.resolve(res.message);
  }
}
