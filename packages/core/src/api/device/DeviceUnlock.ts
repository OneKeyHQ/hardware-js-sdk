import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { getPassphraseState } from '../../utils/deviceFeaturesUtils';
import { BaseMethod } from '../BaseMethod';

export default class DeviceUnlock extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
    this.useDevicePassphraseState = false;
  }

  async run() {
    if (!this.device.features)
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));

    let { features } = this.device;
    const unlocked = this.device?.features?.unlocked === true;

    if (!unlocked) {
      await getPassphraseState(this.device.features, this.device.commands);

      const { message } = await this.device.commands.typedCall('GetFeatures', 'Features', {});
      features = message;
    }

    return Promise.resolve(features);
  }
}
