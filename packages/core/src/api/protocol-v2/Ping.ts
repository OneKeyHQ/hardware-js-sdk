import { BaseMethod } from '../BaseMethod';

export default class Ping extends BaseMethod<{ message?: string }> {
  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
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
