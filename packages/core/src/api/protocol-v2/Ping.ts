import { BaseMethod } from '../BaseMethod';

export default class Ping extends BaseMethod<{ message?: string }> {
  init() {
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
