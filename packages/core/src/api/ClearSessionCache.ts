import { BaseMethod } from './BaseMethod';
import { deviceWalletSessionStore } from '../device/DeviceWalletSessionStore';

import type { ClearSessionCacheParams } from '../types/api/sessionCache';

export default class ClearSessionCache extends BaseMethod<ClearSessionCacheParams> {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      deviceId: this.payload.deviceId,
      passphraseState: this.payload.passphraseState,
    };
  }

  run() {
    const { deviceId, passphraseState } = this.params;
    if (!deviceId) {
      deviceWalletSessionStore.clear();
    } else if (!passphraseState) {
      deviceWalletSessionStore.deleteDevice(deviceId);
    } else {
      deviceWalletSessionStore.delete(deviceId, passphraseState);
    }
    return Promise.resolve({ cleared: true as const });
  }
}
