import { BackupDevice } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceBackup extends BaseMethod<BackupDevice> {
  init() {}

  async run() {
    const res = await this.device.commands.typedCall('BackupDevice', 'Success');

    return Promise.resolve(res.message);
  }
}
