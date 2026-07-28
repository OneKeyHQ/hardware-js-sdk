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
    if (!this.device.features) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
    }

    const isProtocolV2 = this.device.isProtocolV2();
    const { passphraseState } = await getPassphraseStateWithRefreshDeviceInfo(
      this.device,
      isProtocolV2
        ? {
            onlyMainPin: this.payload.useEmptyPassphrase === true,
            initSession: this.payload.initSession === true,
          }
        : undefined
    );

    const passphraseProtection = this.device.getCurrentPassphraseProtection();

    return Promise.resolve(passphraseProtection === true ? passphraseState : undefined);
  }
}
