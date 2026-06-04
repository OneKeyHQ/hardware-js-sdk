import { BaseMethod } from '../BaseMethod';

export default class DeviceGetOnboardingStatus extends BaseMethod {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('GetOnboardingStatus', 'OnboardingStatus', {});
    return Promise.resolve(res.message);
  }
}
