import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../constants/ui-request';
import { refreshProtocolV2DeviceStatus } from '../protocols/protocol-v2/walletSession';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

export default class GetPassphraseState extends BaseMethod {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.useDevicePassphraseState = false;
  }

  async run() {
    if (!this.device.features) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
    }

    const isProtocolV2 = this.device.isProtocolV2();
    if (isProtocolV2 && this.payload.useEmptyPassphrase !== true) {
      const features = await refreshProtocolV2DeviceStatus(this.device);
      if (features.unlocked === false) {
        await this.device.unlockDevice(DeviceSessionPinType.Main, {
          source: 'unlock-coordinator',
          reason: 'device-locked',
          deviceOnly: true,
          method: 'getPassphraseState',
        });
      }
    }
    const { passphraseState } = await getPassphraseStateWithRefreshDeviceInfo(
      this.device,
      isProtocolV2
        ? {
            onlyMainPin: this.payload.useEmptyPassphrase === true,
            initSession: this.payload.initSession === true,
          }
        : undefined
    );

    if (!isProtocolV2 && this.device.getCurrentPassphraseProtection() !== true) {
      return undefined;
    }

    return passphraseState;
  }
}
