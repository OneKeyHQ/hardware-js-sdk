import { UnlockPath } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { validatePath } from '../helpers/pathUtils';

export default class DeviceUnlockPath extends BaseMethod<UnlockPath> {
  init() {
    this.useDevicePassphraseState = false;

    const addressN = validatePath(this.params.address_n, 3);
    this.params = {
      address_n: addressN,
      mac: this.params.mac,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'UnlockPath',
      'UnlockedPathRequest',
      this.params
    );

    return Promise.resolve(res.message);
  }
}
