import { BaseMethod } from '../BaseMethod';

export default class DeviceGetOnboardingStatus extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'OnboardingStatusGet',
      'OnboardingStatus',
      {}
    );
    return message;
  }
}
