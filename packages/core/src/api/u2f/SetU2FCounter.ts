import { SetU2FCounter as HardwareSetU2FCounter } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class SetU2FCounter extends BaseMethod<HardwareSetU2FCounter> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      u2f_counter: this.payload.u2f_counter,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SetU2FCounter', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
