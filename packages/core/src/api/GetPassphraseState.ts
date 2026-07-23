import { EDeviceType } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

export default class GetPassphraseState extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.useDevicePassphraseState = false;
  }

  async run() {
    const { passphraseState } = await getPassphraseStateWithRefreshDeviceInfo(this.device, {
      expectPassphraseState: this.payload.passphraseState,
      onlyMainPin: this.payload.useEmptyPassphrase,
      initSession: this.payload.initSession,
    });

    const passphraseProtection = this.device.getCurrentPassphraseProtection();
    const deviceType = this.device.getCurrentDeviceType();

    if (deviceType === EDeviceType.Pro2) {
      // Protocol V2 的钱包身份由 DeviceSession 返回的 btc_test_address 决定，
      // 不依赖固件 passphrase_enabled 状态。
      return Promise.resolve(passphraseState);
    }

    return Promise.resolve(
      deviceType === EDeviceType.Pro || passphraseProtection === true ? passphraseState : undefined
    );
  }
}
