import { NFTWriteData as HardwareNFTWriteData } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class NFTWriteData extends BaseMethod<HardwareNFTWriteData> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      index: this.payload.index,
      data: this.payload.data,
      offset: this.payload.offset,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('NFTWriteData', 'Success');

    return Promise.resolve(res.message);
  }
}
