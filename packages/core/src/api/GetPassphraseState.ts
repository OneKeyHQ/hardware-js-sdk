import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

export default class GetPassphraseState extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.useDevicePassphraseState = false;
  }

  async run() {
    if (!this.device.features)
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));

    const { passphraseState } = await getPassphraseStateWithRefreshDeviceInfo(this.device);

    const { features } = this.device;

    // refresh device info
    if (features && features.passphrase_protection === true) {
      return Promise.resolve(passphraseState);
    }

    return Promise.resolve(undefined);
  }
}
