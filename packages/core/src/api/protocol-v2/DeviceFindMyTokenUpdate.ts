import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateDeviceFindMyTokenUpdateParams } from './helpers';

import type { DeviceFindMyTokenUpdateParams } from './helpers';

const FIND_MY_TOKEN_UPDATE_TIMEOUT_MS = 8 * 1000;

export default class DeviceFindMyTokenUpdate extends BaseMethod<DeviceFindMyTokenUpdateParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = validateDeviceFindMyTokenUpdateParams(this.payload);
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceFindMyTokenUpdate',
      'Success',
      { token: this.params.token },
      { timeoutMs: FIND_MY_TOKEN_UPDATE_TIMEOUT_MS }
    );
    return res.message;
  }
}
