import { BinanceGetAddress as HardwareBinanceGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class BinanceGetAddress extends BaseMethod<HardwareBinanceGetAddress> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // init params
    this.params = {
      address_n: validatePath(this.payload.path, 3),
      show_display: this.payload.showOnOneKey ?? true,
    };
  }

  async run() {
    return this.device.commands.typedCall('BinanceGetAddress', 'BinanceAddress', {
      ...this.params,
    });
  }
}
