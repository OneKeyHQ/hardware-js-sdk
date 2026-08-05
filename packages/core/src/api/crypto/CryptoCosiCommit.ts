import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

import type { CosiCommit } from '@onekeyfe/hd-transport';

export default class CryptoCosiCommit extends BaseMethod<CosiCommit> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
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
