import { AlgorandSignTx as HardwareAlgorandSignTx } from '@onekeyfe/hd-transport';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { SolanaSignTransactionParams } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';

export default class AlgoSignTransaction extends BaseMethod<HardwareAlgorandSignTx> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
    ]);

    // init params
    const { path, rawTx } = this.payload as SolanaSignTransactionParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.6.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('AlgorandSignTx', 'AlgorandSignedTx', {
      ...this.params,
    });

    const { signature } = res.message;

    return {
      path: serializedPath(this.params.address_n),
      signature,
    };
  }
}
