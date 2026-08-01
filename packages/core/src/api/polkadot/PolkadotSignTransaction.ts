import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getPolkadotVersionRange, parseNetwork } from './networks';

import type { PolkadotSignTransactionParams } from '../../types';
import type { PolkadotSignTx as HardwarePolkadotSignTx } from '@onekeyfe/hd-transport';

export default class PolkadotSignTransaction extends BaseMethod<HardwarePolkadotSignTx> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode];
    this.allowUsePreInitialize = true;

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'network', required: true },
      { name: 'prefix' },
      { name: 'rawTx', type: 'hexString', required: true },
    ]);

    // init params
    const { path, rawTx, network, prefix } = this.payload as PolkadotSignTransactionParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      network: parseNetwork(network),
      prefix,
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
