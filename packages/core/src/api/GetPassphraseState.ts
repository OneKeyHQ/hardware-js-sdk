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
      return Promise.resolve(passphraseProtection === true ? passphraseState : undefined);
    }

    return Promise.resolve(
      deviceType === EDeviceType.Pro || passphraseProtection === true ? passphraseState : undefined
    );
  }
}
