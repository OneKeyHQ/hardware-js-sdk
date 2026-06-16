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
    const { passphraseState, newSession, unlockedAttachPin } =
      await getPassphraseStateWithRefreshDeviceInfo(this.device, {
        expectPassphraseState: this.payload.passphraseState,
        onlyMainPin: this.payload.useEmptyPassphrase,
        allowCreateAttachPin: this.payload.allowCreateAttachPin,
        initSession: this.payload.initSession,
      });

    const { features } = this.device;
    const passphraseProtection = this.device.getCurrentPassphraseProtection() ?? null;
    const deviceType = this.device.getCurrentDeviceType();
    const isProSeries = deviceType === EDeviceType.Pro || deviceType === EDeviceType.Pro2;

    // refresh device info
    return Promise.resolve({
      passphraseState: isProSeries || passphraseProtection === true ? passphraseState : undefined,
      sessionId: this.payload.initSession
        ? newSession ?? undefined
        : newSession ?? features?.sessionId ?? undefined,
      unlockedAttachPin: unlockedAttachPin ?? features?.unlockedAttachPin,
      passphraseProtection,
    });
  }
}
