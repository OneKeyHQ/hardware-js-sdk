import { EosGetPublicKey as HardwareEosGetPublicKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class EosGetPublicKey extends BaseMethod<HardwareEosGetPublicKey> {
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
    return this.device.commands.typedCall('EosGetPublicKey', 'EosPublicKey', {
      ...this.params,
    });
  }
}
