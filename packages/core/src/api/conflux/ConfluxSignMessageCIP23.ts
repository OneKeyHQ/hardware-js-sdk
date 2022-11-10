import { ConfluxSignMessageCIP23 as HardwareConfluxSignMessageCIP23 } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class ConfluxSignMessageCIP23 extends BaseMethod<HardwareConfluxSignMessageCIP23> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'domainHash', type: 'hexString', required: true },
      { name: 'messageHash', type: 'hexString', required: true },
    ]);

    const { path, domainHash, messageHash } = this.payload;

    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      domain_hash: formatAnyHex(domainHash),
      message_hash: formatAnyHex(messageHash),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.4.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'ConfluxSignMessageCIP23',
      'ConfluxMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(res.message);
  }
}
