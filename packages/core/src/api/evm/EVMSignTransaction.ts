import {
  EthereumSignTx,
  EthereumSignTxEIP1559,
  EthereumTxRequest,
} from '@onekeyfe/hd-transport/src/types/messages';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { SchemaParam, validateParams } from '../helpers/paramsValidator';
import {
  EVMSignedTx,
  EVMSignTransactionParams,
  EVMTransaction,
  EVMTransactionEIP1559,
} from '../../types/api/evmSignTransaction';
import { cutString } from '../helpers/stringUtils';
import { formatAnyHex, stripHexStartZeroes } from '../helpers/hexUtils';
import { ERRORS } from '../../constants';

export default class EVMSignTransaction extends BaseMethod {
  addressN: number[] = [];

  isEIP1559 = false;

  formattedTx: EVMTransaction | EVMTransactionEIP1559 | undefined;

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);
    const { path, transaction } = this.payload;
    this.addressN = validatePath(path, 3);

    const tx: EVMSignTransactionParams['transaction'] = transaction;

    this.isEIP1559 = !!tx.maxFeePerGas && !!tx.maxPriorityFeePerGas;

    // check if transaction is valid
    const schema: SchemaParam[] = [
      { name: 'to', type: 'hexString', required: true },
      { name: 'value', type: 'hexString', required: true },
      { name: 'gasLimit', type: 'hexString', required: true },
      { name: 'nonce', type: 'hexString', required: true },
      { name: 'chainId', type: 'number', required: true },
      { name: 'data', type: 'hexString' },
    ];
    if (this.isEIP1559) {
      schema.push({ name: 'maxFeePerGas', type: 'hexString', required: true });
      schema.push({ name: 'maxPriorityFeePerGas', type: 'hexString', required: true });
    } else {
      schema.push({ name: 'gasPrice', type: 'hexString', required: true });
      schema.push({ name: 'txType', type: 'number' });
    }
    validateParams(tx, schema);

    this.formattedTx = formatAnyHex(tx);
  }

  processTxRequest = async (
    request: EthereumTxRequest,
    data: string,
    chain_id: number | undefined
  ): Promise<EVMSignedTx> => {
    if (!request.data_length) {
      let v = request.signature_v;
      const r = request.signature_r;
      const s = request.signature_s;

      if (v == null || r == null || s == null) {
        throw ERRORS.TypedError('Runtime', 'processTxRequest: Unexpected request');
      }

      // if v is not 27 or 28, it is a legacy transaction
      if (chain_id && v <= 1) {
        v += 2 * chain_id + 35;
      }

      return Promise.resolve({
        v: `0x${v.toString(16)}`,
        r: `0x${r}`,
        s: `0x${s}`,
      });
    }

    const [first, rest] = cutString(data, request.data_length * 2);
    const response = await this.device.commands.typedCall('EthereumTxAck', 'EthereumTxRequest', {
      data_chunk: first,
    });

    return this.processTxRequest(response.message, rest, chain_id);
  };

  evmSignTx = async (addressN: number[], tx: EVMTransaction) => {
    const { to, value, gasPrice, gasLimit, nonce, data, chainId, txType } = tx;

    const length = data == null ? 0 : data.length / 2;

    const [first, rest] = cutString(data, 1024 * 2);

    let message: EthereumSignTx = {
      address_n: addressN,
      nonce: stripHexStartZeroes(nonce),
      gas_price: stripHexStartZeroes(gasPrice),
      gas_limit: stripHexStartZeroes(gasLimit),
      to,
      value: stripHexStartZeroes(value),
      chain_id: chainId,
    };

    if (length !== 0) {
      message = {
        ...message,
        data_length: length,
        data_initial_chunk: first,
      };
    }

    if (txType !== null) {
      message = {
        ...message,
        tx_type: txType,
      };
    }

    const response = await this.device.commands.typedCall(
      'EthereumSignTx',
      'EthereumTxRequest',
      message
    );

    return this.processTxRequest(response.message, rest, chainId);
  };

  evmSignTxEip1559 = async (addressN: number[], tx: EVMTransactionEIP1559) => {
    const {
      to,
      value,
      gasLimit,
      nonce,
      data,
      chainId,
      maxFeePerGas,
      maxPriorityFeePerGas,
      accessList,
    } = tx;

    const length = data == null ? 0 : data.length / 2;

    const [first, rest] = cutString(data, 1024 * 2);

    const message: EthereumSignTxEIP1559 = {
      address_n: addressN,
      nonce: stripHexStartZeroes(nonce),
      max_gas_fee: stripHexStartZeroes(maxFeePerGas),
      max_priority_fee: stripHexStartZeroes(maxPriorityFeePerGas),
      gas_limit: stripHexStartZeroes(gasLimit),
      to,
      value: stripHexStartZeroes(value),
      data_length: length,
      data_initial_chunk: first,
      chain_id: chainId,
      access_list: (accessList || []).map(a => ({
        address: a.address,
        storage_keys: a.storageKeys,
      })),
    };

    const response = await this.device.commands.typedCall(
      'EthereumSignTxEIP1559',
      'EthereumTxRequest',
      message
    );

    return this.processTxRequest(response.message, rest, chainId);
  };

  getVersionRange() {
    if (this.isEIP1559) {
      return {
        model_mini: {
          min: '2.1.11',
        },
      };
    }
    return {
      model_mini: {
        min: '1.0.0',
      },
    };
  }

  async run() {
    const { addressN, isEIP1559, formattedTx } = this;

    const signedTx = await (isEIP1559
      ? this.evmSignTxEip1559(addressN, formattedTx as EVMTransactionEIP1559)
      : this.evmSignTx(addressN, formattedTx as EVMTransaction));

    return Promise.resolve(signedTx);
  }
}
