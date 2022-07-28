import { TxInputType, TxOutputType } from '@onekeyfe/hd-transport';

import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { getOutputScriptType, isSegwitPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import {
  AccountAddresses,
  BTCSignTransactionParams,
  RefTransaction,
  TransactionOptions,
} from '../../types/api/btcSignTransaction';
import signtx from './helpers/signtx';
import signtxLegacy from './helpers/signtxLegacy';
import { getCoinInfo } from './helpers/btcParamsUtils';

type Params = {
  inputs: TxInputType[];
  outputs: TxOutputType[];
  refTxs: RefTransaction[];
  addresses?: AccountAddresses;
  options: TransactionOptions;
  coinName: string;
};
export default class BTCSignTransaction extends BaseMethod<Params> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'coin', type: 'string', required: true },
      { name: 'inputs', type: 'array', required: true },
      { name: 'outputs', type: 'array', required: true },
      { name: 'refTxs', type: 'array', required: true, allowEmpty: true },
      { name: 'locktime', type: 'number' },
      { name: 'version', type: 'number' },
      { name: 'expiry', type: 'number' },
      { name: 'overwintered', type: 'boolean' },
      { name: 'versionGroupId', type: 'number' },
      { name: 'branchId', type: 'number' },
      { name: 'timestamp', type: 'number' },
    ]);

    this.payload.refTxs.forEach((tx: RefTransaction) => {
      validateParams(tx, [
        { name: 'hash', type: 'hexString', required: true },
        { name: 'inputs', type: 'array', required: true },
        { name: 'bin_outputs', type: 'array', required: !Array.isArray(tx.outputs) },
        { name: 'outputs', type: 'array' },
        { name: 'version', type: 'number', required: true },
        { name: 'lock_time', type: 'number', required: true },
        { name: 'extra_data', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'version_group_id', type: 'number' },
      ]);
    });

    this.payload.inputs.forEach((input: any) => {
      validatePath(input.address_n);
      const useAmount = isSegwitPath(input.address_n);
      validateParams(input, [
        { name: 'prev_hash', type: 'hexString', required: true },
        { name: 'prev_index', type: 'number', required: true },
        { name: 'script_type', type: 'string' },
        { name: 'amount', type: 'string', required: useAmount },
        { name: 'sequence', type: 'number' },
        { name: 'multisig', type: 'object' },
      ]);
    });

    this.payload.outputs.forEach((output: any) => {
      validateParams(output, [
        { name: 'address_n', type: 'array' },
        { name: 'address', type: 'string' },
        { name: 'amount', type: 'string' },
        { name: 'op_return_data', type: 'string' },
        { name: 'multisig', type: 'object' },
      ]);

      if (
        Object.prototype.hasOwnProperty.call(output, 'address_n') &&
        Object.prototype.hasOwnProperty.call(output, 'address')
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          'Cannot use address and address_n in one output'
        );
      }

      if (output.address_n) {
        const scriptType = getOutputScriptType(output.address_n);
        if (output.script_type !== scriptType)
          throw ERRORS.TypedError(
            HardwareErrorCode.CallMethodInvalidParameter,
            `Output change script_type should be set to ${scriptType}`
          );
      }
    });

    const { inputs, outputs, refTxs, account, coin } = this.payload as BTCSignTransactionParams;

    const coinName = getCoinInfo(undefined, coin).name;

    this.params = {
      inputs,
      outputs,
      refTxs,
      addresses: account ? account.addresses : undefined,
      options: {
        lock_time: this.payload.locktime,
        timestamp: this.payload.timestamp,
        version: this.payload.version,
        expiry: this.payload.expiry,
        overwintered: this.payload.overwintered,
        version_group_id: this.payload.versionGroupId,
        branch_id: this.payload.branchId,
      },
      coinName,
    };
  }

  async run() {
    const { device, params } = this;

    const useLegacySignProcess = device.unavailableCapabilities.replaceTransaction;

    const { refTxs } = params;

    const signTxMethod = !useLegacySignProcess ? signtx : signtxLegacy;
    const response = await signTxMethod(
      device.commands.typedCall.bind(device.commands),
      params.inputs,
      params.outputs,
      refTxs,
      params.options,
      params.coinName
    );

    return response;
  }
}
