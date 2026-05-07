import { BaseMethod } from '../BaseMethod';

export default class FilesystemFixPermission extends BaseMethod {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemFixPermission', 'Success', {});
    return Promise.resolve(res.message);
  }
}
