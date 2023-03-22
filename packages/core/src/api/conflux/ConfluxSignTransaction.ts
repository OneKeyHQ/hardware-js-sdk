import { ConfluxSignTx, ConfluxTxRequest } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import {
  ConfluxSignedTx,
  ConfluxSignTransactionParams,
  ConfluxTransaction,
} from '../../types/api/confluxSignTransaction';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { SchemaParam, validateParams } from '../helpers/paramsValidator';

import { cutString } from '../helpers/stringUtils';
import { formatAnyHex, stripHexStartZeroes } from '../helpers/hexUtils';

export default class ConfluxSignTransaction extends BaseMethod {
  addressN: number[] = [];

  formattedTx: ConfluxTransaction | undefined;

  init() {
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);
    const { path, transaction } = this.payload;
    this.addressN = validatePath(path, 3);

    const tx: ConfluxSignTransactionParams['transaction'] = transaction;

    // check if transaction is valid
    const schema: SchemaParam[] = [
      { name: 'to', type: 'hexString', required: true },
      { name: 'value', type: 'hexString', required: true },
      { name: 'gasLimit', type: 'hexString', required: true },
      { name: 'gasPrice', type: 'hexString', required: true },
      { name: 'nonce', type: 'hexString', required: true },
      { name: 'epochHeight', type: 'hexString', required: true },
      { name: 'storageLimit', type: 'hexString', required: true },
      { name: 'chainId', type: 'number', required: true },
      { name: 'data', type: 'hexString' },
    ];

    validateParams(tx, schema);

    this.formattedTx = formatAnyHex(tx);
  }

  processTxRequest = async (request: ConfluxTxRequest, data: string): Promise<ConfluxSignedTx> => {
    if (!request.data_length) {
      const v = request.signature_v;
      const r = request.signature_r;
      const s = request.signature_s;

      if (v == null || r == null || s == null) {
        throw ERRORS.TypedError(HardwareErrorCode.CallMethodError, 'sign transaction failed');
      }

      return Promise.resolve({
        v: `0x${v.toString(16)}`,
        r: `0x${r}`,
        s: `0x${s}`,
      });
    }

    const [first, rest] = cutString(data, request.data_length * 2);
    const response = await this.device.commands.typedCall('ConfluxTxAck', 'ConfluxTxRequest', {
      data_chunk: first,
    });

    return this.processTxRequest(response.message, rest);
  };

  evmSignTx = async (addressN: number[], tx: ConfluxTransaction) => {
    const { to, value, gasPrice, gasLimit, nonce, data, chainId, epochHeight, storageLimit } = tx;

    const length = data == null ? 0 : data.length / 2;

    const [first, rest] = cutString(data, 1024 * 2);

    let message: ConfluxSignTx = {
      address_n: addressN,
      nonce: stripHexStartZeroes(nonce),
      gas_price: stripHexStartZeroes(gasPrice),
      gas_limit: stripHexStartZeroes(gasLimit),
      to,
      value: stripHexStartZeroes(value),
      epoch_height: stripHexStartZeroes(epochHeight),
      storage_limit: stripHexStartZeroes(storageLimit),
      chain_id: chainId,
    };

    if (length !== 0) {
      message = {
        ...message,
        data_length: length,
        data_initial_chunk: first,
      };
    }

    const response = await this.device.commands.typedCall(
      'ConfluxSignTx',
      'ConfluxTxRequest',
      message
    );

    return this.processTxRequest(response.message, rest);
  };

  getVersionRange() {
    return {
      model_mini: {
        min: '2.4.0',
      },
    };
  }

  async run() {
    const { addressN, formattedTx } = this;
    if (formattedTx == null) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'ConfluxSignTransaction: format tx error'
      );
    }

    const signedTx = await this.evmSignTx(addressN, formattedTx);

    return Promise.resolve(signedTx);
  }
}
