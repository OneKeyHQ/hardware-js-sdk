import { SpiFlashRead } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { formatAnyHex } from '../helpers/hexUtils';

export default class DeviceSpiFlashRead extends BaseMethod<SpiFlashRead> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      address: this.payload.address,
      len: formatAnyHex(this.payload.data),
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SpiFlashRead', 'SpiFlashData', this.params);

    return Promise.resolve(res.message);
  }
}
