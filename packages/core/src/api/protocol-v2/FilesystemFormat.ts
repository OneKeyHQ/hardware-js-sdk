import { BaseMethod } from '../BaseMethod';

export default class FilesystemFormat extends BaseMethod {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('FilesystemFormat', 'Success', {});
    return Promise.resolve(res.message);
  }
}
