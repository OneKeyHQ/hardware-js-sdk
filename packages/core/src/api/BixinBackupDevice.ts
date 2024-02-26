import { BixinBackupDevice } from '@onekeyfe/hd-transport';
import { BaseMethod } from './BaseMethod';

export default class DeviceBackup extends BaseMethod<BixinBackupDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const res = await this.device.commands.typedCall('BixinBackupDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
