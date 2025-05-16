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

    const { passphraseState, newSession } = await getPassphraseStateWithRefreshDeviceInfo(
      this.device
    );

    console.log('=====>>>>>> GetPassphraseState run passphraseState: ', passphraseState);
    console.log('=====>>>>>> GetPassphraseState run newSession: ', newSession);
    console.log(
      '=====>>>>>> GetPassphraseState run features: ',
      this.device.features.passphrase_protection
    );

    const { features } = this.device;

    // refresh device info
    if (features && features.passphrase_protection === true) {
      if (!newSession) {
        console.log('=====>>>>>> GetPassphraseState run tryFixInternalState', newSession);
        if (passphraseState && features.device_id) {
          this.device.tryFixInternalState(passphraseState, features.device_id, features.session_id);
        }
      }

      return Promise.resolve(passphraseState);
    }

    return Promise.resolve(undefined);
  }
}
