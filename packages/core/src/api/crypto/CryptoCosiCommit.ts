import { CosiCommit } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class CryptoCosiCommit extends BaseMethod<CosiCommit> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];
    const addressN = validatePath(this.payload.path);
    // init params
    this.params = {
      address_n: addressN,
      data: this.payload.data,
    };
  }

  async run() {
    return this.device.commands.typedCall('CosiCommit', 'CosiCommitment', this.params);
  }
}
