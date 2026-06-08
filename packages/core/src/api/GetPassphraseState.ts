import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

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

    const { passphraseState, newSession, unlockedAttachPin } =
      await getPassphraseStateWithRefreshDeviceInfo(this.device, {
        expectPassphraseState: this.payload.passphraseState,
        onlyMainPin: this.payload.useEmptyPassphrase,
        allowCreateAttachPin: this.payload.allowCreateAttachPin,
    });

    const { features } = this.device;
    const passphraseProtection = this.device.getCurrentPassphraseProtection() ?? null;
    const deviceType = this.device.getCurrentDeviceType();
    const isProSeries = deviceType === EDeviceType.Pro || deviceType === EDeviceType.Pro2;

    // refresh device info
    return Promise.resolve({
      passphrase_state: isProSeries || passphraseProtection === true ? passphraseState : undefined,
      session_id: newSession ?? features?.session_id ?? undefined,
      unlocked_attach_pin: unlockedAttachPin ?? features?.unlocked_attach_pin,
      passphrase_protection: passphraseProtection,
    });
  }
}
