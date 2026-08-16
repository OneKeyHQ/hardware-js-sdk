import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

import type { BixinBackupDevice } from '@onekeyfe/hd-transport';

export default class DeviceBackup extends BaseMethod<BixinBackupDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('BixinBackupDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
