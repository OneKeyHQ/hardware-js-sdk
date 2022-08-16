import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../constants/ui-request';
import { getDeviceType, getPassphraseState } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

export default class GetPassphraseState extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
    this.useDevicePassphraseState = false;
  }

  async run() {
    if (!this.device.features)
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));

    let { features } = this.device;
    const locked = this.device?.features?.unlocked === false;
    const passphraseState = await getPassphraseState(this.device.features, this.device.commands);
    const isModeT = getDeviceType(features) === 'touch' || getDeviceType(features) === 'pro';

    if (isModeT && locked) {
      const { message } = await this.device.commands.typedCall('GetFeatures', 'Features', {});
      features = message;
    }

    if (features && features.passphrase_protection === true) {
      return Promise.resolve(passphraseState);
    }
    return Promise.resolve(undefined);
  }
}
