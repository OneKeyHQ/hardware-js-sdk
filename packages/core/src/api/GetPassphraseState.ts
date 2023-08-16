import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../constants/ui-request';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

export default class GetPassphraseState extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];
    this.useDevicePassphraseState = false;
  }

  async run() {
    if (!this.device.features)
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));

    const passphraseState = await getPassphraseStateWithRefreshDeviceInfo(this.device);
    const { features } = this.device;

    if (features && features.passphrase_protection === true) {
      if (passphraseState && features.device_id) {
        this.device.tryFixInternalState(passphraseState, features.device_id, features.session_id);
      }
      return Promise.resolve(passphraseState);
    }
    return Promise.resolve(undefined);
  }
}
