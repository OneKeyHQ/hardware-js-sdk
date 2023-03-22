import { CosmosSignTx as HardwareCosmosSignTx } from '@onekeyfe/hd-transport';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { CosmosSignTransactionParams } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';

export default class CosmosSignTransaction extends BaseMethod<HardwareCosmosSignTx> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
    ]);

    // init params
    const { path, rawTx } = this.payload as CosmosSignTransactionParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.10.0',
      },
      model_touch: {
        min: '4.0.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('CosmosSignTx', 'CosmosSignedTx', {
      ...this.params,
    });

    const { signature } = res.message;

    return {
      path: serializedPath(this.params.address_n),
      signature,
    };
  }
}
