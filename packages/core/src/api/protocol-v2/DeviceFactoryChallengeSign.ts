import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateDeviceFactoryChallengeSignParams } from './helpers';

import type { DeviceFactoryChallengeSignParams } from './helpers';

export default class DeviceFactoryChallengeSign extends BaseMethod<DeviceFactoryChallengeSignParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = validateDeviceFactoryChallengeSignParams(this.payload);
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceCertificateSign',
      'DeviceCertificateSignature',
      { data: this.params.digest }
    );
    return res.message;
  }
}
