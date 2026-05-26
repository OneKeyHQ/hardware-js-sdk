import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

import type { NeoSignTx } from '@onekeyfe/hd-transport';
import type { DeviceFirmwareRange } from '../../types';

export default class NeoSignTransaction extends BaseMethod<NeoSignTx> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
      { name: 'magicNumber', type: 'number', required: true },
    ]);

    const { path, rawTx, magicNumber } = this.payload;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
      network_magic: magicNumber,
    };
  }

  getVersionRange(): DeviceFirmwareRange {
    return {
      pro2: {
        min: '0.0.0',
        unsupported: true,
      },
      pro: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    this.params = {
      address_n: this.params.address_n,
      raw_tx: this.params.raw_tx,
      network_magic: this.params.network_magic,
    };

    const res = await typedCall('NeoSignTx', ['NeoSignedTx'], {
      ...this.params,
    });

    return {
      signature: res.message.signature,
      publicKey: res.message.public_key,
    };
  }
}
