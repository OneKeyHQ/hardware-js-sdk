import { ERRORS } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import TransportManager from '../../data-manager/TransportManager';
import { signTransaction } from './latest/signTransaction';
import { signTransaction as signTransactionLegacyV1 } from './legacyV1/signTransaction';

import type {
  EVMSignTransactionParams,
  EVMTransaction,
  EVMTransactionEIP1559,
  EVMTransactionEIP7702,
} from '../../types';
import type { SchemaParam } from '../helpers/paramsValidator';

export default class EVMSignTransaction extends BaseMethod {
  addressN: number[] = [];

  isEIP1559 = false;

  isEIP7702 = false;

  formattedTx: EVMTransaction | EVMTransactionEIP1559 | EVMTransactionEIP7702 | undefined;

  /**
   * Check if transaction has EIP7702 authorization list
   * Following ethereumjs pattern for type detection
   */
  private hasEIP7702Features(tx: EVMSignTransactionParams['transaction']): boolean {
    const authList = (tx as EVMTransactionEIP7702).authorizationList;
    return !!(authList && Array.isArray(authList) && authList.length > 0);
  }

  /**
   * Check if transaction has EIP1559 fee market features
   * Both maxFeePerGas and maxPriorityFeePerGas must be present
   */
  private hasEIP1559Features(tx: EVMSignTransactionParams['transaction']): boolean {
    return !!(tx.maxFeePerGas && tx.maxPriorityFeePerGas);
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);
    const { path, transaction } = this.payload;
    this.addressN = validatePath(path, 3);

    const tx: EVMSignTransactionParams['transaction'] = transaction;

    // Transaction type detection based on distinctive features
    // Following ethereumjs pattern: check most specific features first

    // EIP7702: Has authorizationList (extends EIP1559)
    this.isEIP7702 = this.hasEIP7702Features(tx);

    // EIP1559: Has EIP1559 fee fields but no authorizationList (extends EIP2930)
    this.isEIP1559 = this.hasEIP1559Features(tx) && !this.isEIP7702;

    // check if transaction is valid
    const schema: SchemaParam[] = [
      { name: 'to', type: 'hexString', required: true },
      { name: 'value', type: 'hexString', required: true },
      { name: 'gasLimit', type: 'hexString', required: true },
      { name: 'nonce', type: 'hexString', required: true },
      { name: 'chainId', type: 'number', required: true },
      { name: 'data', type: 'hexString' },
    ];
    if (this.isEIP7702) {
      schema.push({ name: 'maxFeePerGas', type: 'hexString', required: true });
      schema.push({ name: 'maxPriorityFeePerGas', type: 'hexString', required: true });
      schema.push({ name: 'authorizationList', type: 'array', required: true });
    } else if (this.isEIP1559) {
      schema.push({ name: 'maxFeePerGas', type: 'hexString', required: true });
      schema.push({ name: 'maxPriorityFeePerGas', type: 'hexString', required: true });
    } else {
      schema.push({ name: 'gasPrice', type: 'hexString', required: true });
      schema.push({ name: 'txType', type: 'number' });
    }
    validateParams(tx, schema);

    this.formattedTx = formatAnyHex(tx);
  }

  getVersionRange() {
    if (this.isEIP7702) {
      return {
        model_classic1s: {
          min: '3.13.0',
        },
        pro: {
          min: '4.16.0',
        },
      };
    }
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
    const { addressN, isEIP1559, isEIP7702, formattedTx } = this;

    if (formattedTx == null) throw ERRORS.TypedError('Runtime', 'formattedTx is not set');

    if (TransportManager.getProtocolV1MessageSchema() === 'protocolV1Legacy') {
      return signTransactionLegacyV1({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        addressN,
        tx: formattedTx,
        isEIP1559,
        isEIP7702,
      });
    }

    return signTransaction({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      addressN,
      tx: formattedTx,
      isEIP1559,
      isEIP7702,
    });
  }
}
