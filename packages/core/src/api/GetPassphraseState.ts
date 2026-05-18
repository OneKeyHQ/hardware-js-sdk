import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { getDeviceType } from '../utils/deviceInfoUtils';
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
      await getPassphraseStateWithRefreshDeviceInfo(this.device);

    const { features } = this.device;
    const isPro2 = getDeviceType(features) === EDeviceType.Pro2;

    if (isPro2) {
      return Promise.resolve({
        passphrase_state: passphraseState,
        session_id: newSession ?? features?.session_id ?? undefined,
        unlocked_attach_pin: unlockedAttachPin,
        passphrase_protection: features?.passphrase_protection ?? null,
      });
    }

    // refresh device info
    if (features && features.passphrase_protection === true) {
      return Promise.resolve(passphraseState);
    }

    return Promise.resolve(undefined);
  }
}
