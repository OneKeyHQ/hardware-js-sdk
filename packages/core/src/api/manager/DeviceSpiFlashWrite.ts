import { SpiFlashWrite } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { formatAnyHex } from '../helpers/hexUtils';

export default class DeviceSpiFlashWrite extends BaseMethod<SpiFlashWrite> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      address: this.payload.address,
      data: formatAnyHex(this.payload.data),
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SpiFlashWrite', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
