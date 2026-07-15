import { BaseMethod } from '../BaseMethod';

export default class Ping extends BaseMethod<{ message?: string }> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { message: this.payload.message };
  }

  async run() {
    const res = await this.device.commands.typedCall('Ping', 'Success', {
      message: this.params.message ?? '',
    });
    return Promise.resolve(res.message);
  }
}
