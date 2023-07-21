import { ERRORS } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { SchemaParam, validateParams } from '../helpers/paramsValidator';
import { EVMSignTransactionParams, EVMTransaction, EVMTransactionEIP1559 } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';
import TransportManager from '../../data-manager/TransportManager';
import { signTransaction } from './latest/signTransaction';
import { signTransaction as signTransactionLegacyV1 } from './legacyV1/signTransaction';

export default class EVMSignTransaction extends BaseMethod {
  addressN: number[] = [];

  isEIP1559 = false;

  formattedTx: EVMTransaction | EVMTransactionEIP1559 | undefined;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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

    if (formattedTx == null) throw ERRORS.TypedError('Runtime', 'formattedTx is not set');

    if (TransportManager.getMessageVersion() === 'v1') {
      return signTransactionLegacyV1({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        addressN,
        tx: formattedTx,
        isEIP1559,
      });
    }

    return signTransaction({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      addressN,
      tx: formattedTx,
      isEIP1559,
      supportTrezor: this.supportTrezor,
      device: this.device,
    });
  }
}
