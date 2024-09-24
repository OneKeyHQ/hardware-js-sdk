import { PolkadotSignTx as HardwarePolkadotSignTx } from '@onekeyfe/hd-transport';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { PolkadotSignTransactionParams } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';
import { getPolkadotVersionRange } from './networks';

export default class PolkadotSignTransaction extends BaseMethod<HardwarePolkadotSignTx> {
  hasBundle = false;

  preCheckVersionLimit = true;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'network', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
    ]);

    // init params
    const { path, rawTx, network } = this.payload as PolkadotSignTransactionParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      network,
      raw_tx: formatAnyHex(rawTx),
    };
  }

  getVersionRange() {
    return getPolkadotVersionRange(this.params.network);
  }

  async run() {
    const res = await this.device.commands.typedCall('PolkadotSignTx', 'PolkadotSignedTx', {
      ...this.params,
    });

    const { signature } = res.message;

    return {
      path: serializedPath(this.params.address_n),
      signature,
    };
  }
}
