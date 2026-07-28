import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

import type { CosmosSignTx as HardwareCosmosSignTx } from '@onekeyfe/hd-transport';
import type { CosmosSignTransactionParams } from '../../types';

export default class CosmosSignTransaction extends BaseMethod<HardwareCosmosSignTx> {
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
    try {
      const res = await this.device.commands.typedCall('CosmosSignTx', 'CosmosSignedTx', {
        ...this.params,
      });

      const { signature } = res.message;

      return {
        path: serializedPath(this.params.address_n),
        signature,
      };
    } catch (error) {
      const { message } = error;
      if (
        message.includes('Failure_DataError,Json parse failed') ||
        message.includes('Failure_DataError,Invalid message')
      ) {
        throw ERRORS.TypedError(HardwareErrorCode.CosmosInvalidJsonMessage, message);
      }
      throw error;
    }
  }
}
