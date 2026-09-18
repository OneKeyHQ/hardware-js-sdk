import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

const FIND_MY_TOKEN_STATE_TIMEOUT_MS = 5 * 1000;

export default class DeviceFindMyTokenStateGet extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceFindMyTokenStateGet',
      'DeviceFindMyTokenState',
      {},
      { timeoutMs: FIND_MY_TOKEN_STATE_TIMEOUT_MS }
    );
    return res.message;
  }
}
