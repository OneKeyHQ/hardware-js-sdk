import { BaseMethod } from '../BaseMethod';

export default class FilesystemFormat extends BaseMethod {
  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemFormat', 'Success', {
      data: true,
      user: true,
    });
    return Promise.resolve(res.message);
  }
}
