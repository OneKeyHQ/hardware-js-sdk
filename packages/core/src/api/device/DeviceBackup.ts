import { BaseMethod } from '../BaseMethod';

import type { BackupDevice } from '@onekeyfe/hd-transport';

export default class DeviceBackup extends BaseMethod<BackupDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('BackupDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
