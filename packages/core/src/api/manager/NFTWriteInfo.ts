import { NFTWriteInfo as HardwareNFTWriteInfo } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class NFTWriteInfo extends BaseMethod<HardwareNFTWriteInfo> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      index: this.payload.index,
      width: this.payload.width,
      height: this.payload.height,
      name_zh: this.payload.name_zh,
      name_en: this.payload.name_en,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('NFTWriteInfo', 'Success');

    return Promise.resolve(res.message);
  }
}
