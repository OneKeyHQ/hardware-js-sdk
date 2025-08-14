import { FilecoinSignTx as HardwareFilecoinSignTx } from '@onekeyfe/hd-transport';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { FilecoinSignTransactionParams } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';

export default class FilecoinSignTransaction extends BaseMethod<HardwareFilecoinSignTx> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
      { name: 'isTestnet', type: 'boolean' },
    ]);

    // init params
    const { path, rawTx, isTestnet } = this.payload as FilecoinSignTransactionParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
      testnet: isTestnet,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.10.0',
      },
      model_touch: {
        min: '3.5.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('FilecoinSignTx', 'FilecoinSignedTx', {
      ...this.params,
    });

    const { signature } = res.message;

    return {
      path: serializedPath(this.params.address_n),
      signature,
    };
  }
}
