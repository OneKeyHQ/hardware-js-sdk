import { StellarMemoType } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

import type {
  StellarSignTx as HardwareStellarSignTx,
  StellarSignedTx,
} from '@onekeyfe/hd-transport';
import type { StellarOperation, StellarSignTransactionParams } from '../../types';

export default class StellarSignTransaction extends BaseMethod<HardwareStellarSignTx> {
  operations: any[] = [];

  sorobanDataXDR?: string;

  parseOperation = (op: StellarOperation) => {
    switch (op.type) {
      case 'createAccount':
        validateParams(op, [
          { name: 'destination', type: 'string', required: true },
          { name: 'startingBalance', type: 'bigNumber', required: true },
        ]);
        return {
          type: 'StellarCreateAccountOp',
          source_account: op.source,
          new_account: op.destination,
          starting_balance: op.startingBalance,
        };

      case 'payment':
        validateParams(op, [
          { name: 'destination', type: 'string', required: true },
          { name: 'amount', type: 'bigNumber', required: true },
          { name: 'asset', required: true },
        ]);
        return {
          type: 'StellarPaymentOp',
          source_account: op.source,
          destination_account: op.destination,
          asset: op.asset,
          amount: op.amount,
        };

      case 'pathPayment':
        validateParams(op, [{ name: 'destAmount', type: 'bigNumber', required: true }]);
        return {
          type: 'StellarPathPaymentOp',
          source_account: op.source,
          send_asset: op.sendAsset,
          send_max: op.sendMax,
          destination_account: op.destination,
          destination_asset: op.destAsset,
          destination_amount: op.destAmount,
          paths: op.path,
        };

      case 'createPassiveOffer':
        validateParams(op, [{ name: 'amount', type: 'bigNumber', required: true }]);
        return {
          type: 'StellarCreatePassiveOfferOp',
          source_account: op.source,
          buying_asset: op.buying,
          selling_asset: op.selling,
          amount: op.amount,
          price_n: op.price.n,
          price_d: op.price.d,
        };

      case 'manageOffer':
        validateParams(op, [{ name: 'amount', type: 'bigNumber', required: true }]);
        return {
          type: 'StellarManageOfferOp',
          source_account: op.source,
          buying_asset: op.buying,
          selling_asset: op.selling,
          amount: op.amount,
          offer_id: op.offerId,
          price_n: op.price.n,
          price_d: op.price.d,
        };

      case 'setOptions': {
        const signer = op.signer
          ? {
              signer_type: op.signer.type,
              signer_key: op.signer.key,
              signer_weight: op.signer.weight,
            }
          : undefined;
        return {
          type: 'StellarSetOptionsOp',
          source_account: op.source,
          clear_flags: op.clearFlags,
          set_flags: op.setFlags,
          master_weight: op.masterWeight,
          low_threshold: op.lowThreshold,
          medium_threshold: op.medThreshold,
          high_threshold: op.highThreshold,
          home_domain: op.homeDomain,
          inflation_destination_account: op.inflationDest,
          ...signer,
        };
      }

      case 'changeTrust':
        validateParams(op, [{ name: 'limit', type: 'bigNumber' }]);
        return {
          type: 'StellarChangeTrustOp',
          source_account: op.source,
          asset: op.line,
          limit: op.limit,
        };

      case 'allowTrust':
        return {
          type: 'StellarAllowTrustOp',
          source_account: op.source,
          trusted_account: op.trustor,
          asset_type: op.assetType,
          asset_code: op.assetCode,
          is_authorized: op.authorize ? 1 : 0,
        };

      case 'accountMerge':
        return {
          type: 'StellarAccountMergeOp',
          source_account: op.source,
          destination_account: op.destination,
        };

      case 'manageData':
        return {
          type: 'StellarManageDataOp',
          source_account: op.source,
          key: op.name,
          value: op.value,
        };

      case 'bumpSequence':
        return {
          type: 'StellarBumpSequenceOp',
          source_account: op.source,
          bump_to: op.bumpTo,
        };

      case 'invokeHostFunctionOneKey':
        return {
          type: 'StellarInvokeHostFunctionOp',
          source_account: op.source,
          contract_address: op.contract,
          function_name: op.functionName,
          call_args_xdr: op.callArgsXDRHex,
          soroban_auth_xdr: op.sorobanAuthXDRHex,
        };

      case 'pathPaymentStrictReceive':
        validateParams(op, [{ name: 'sendMax', type: 'bigNumber', required: true }]);
        validateParams(op, [{ name: 'destAmount', type: 'bigNumber', required: true }]);
        return {
          type: 'StellarPathPaymentStrictReceiveOp',
          source_account: op.source,
          send_asset: op.sendAsset,
          send_max: op.sendMax,
          destination_account: op.destination,
          destination_asset: op.destAsset,
          destination_amount: op.destAmount,
          paths: op.path,
        };

      case 'pathPaymentStrictSend':
        validateParams(op, [{ name: 'sendAmount', type: 'bigNumber', required: true }]);
        validateParams(op, [{ name: 'destMin', type: 'bigNumber', required: true }]);
        return {
          type: 'StellarPathPaymentStrictSendOp',
          source_account: op.source,
          send_asset: op.sendAsset,
          send_amount: op.sendAmount,
          destination_account: op.destination,
          destination_asset: op.destAsset,
          destination_min: op.destMin,
          paths: op.path,
        };

      default:
        return {};
    }
  };

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'networkPassphrase', type: 'string', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);

    const { transaction, networkPassphrase } = this.payload as StellarSignTransactionParams;
    if (!transaction.timebounds) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'timebounds is required'
      );
    }

    // init params
    const addressN = validatePath(this.payload.path, 3);

    const isSoroban = transaction.operations.some(op => op.type === 'invokeHostFunctionOneKey');

    this.params = {
      address_n: addressN,
      network_passphrase: networkPassphrase,
      source_account: transaction.source,
      fee: transaction.fee,
      sequence_number: transaction.sequence,
      num_operations: transaction.operations.length,
      memo_type: StellarMemoType.NONE,
      timebounds_start: transaction.timebounds.minTime,
      timebounds_end: transaction.timebounds.maxTime,
      ...(isSoroban ? { is_soroban_transaction: true } : {}),
    };

    if (isSoroban) {
      if (transaction.operations.length !== 1) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          'Soroban transactions must contain exactly one operation'
        );
      }
      if (!transaction.sorobanDataXDR) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          'sorobanDataXDR is required for Soroban transactions'
        );
      }
      this.sorobanDataXDR = transaction.sorobanDataXDR;
    }

    if (transaction.memo) {
      this.params.memo_type = transaction.memo.type;
      this.params.memo_text = transaction.memo.text;
      this.params.memo_id = transaction.memo.id;
      this.params.memo_hash = transaction.memo.hash;
    }

    transaction.operations.forEach(op => {
      const transformed = this.parseOperation(op);
      if (transformed) {
        this.operations.push(transformed);
      }
    });
  }

  processTxRequest = async (
    response: { type: string; message: any },
    operations: any[],
    index: number
  ): Promise<StellarSignedTx> => {
    switch (response.type) {
      case 'StellarSignedTx':
        return response.message;

      case 'StellarSorobanDataRequest': {
        const sorobanRes = await this.device.commands.typedCall(
          'StellarSorobanDataAck',
          'StellarSignedTx',
          { data_xdr: this.sorobanDataXDR }
        );
        return sorobanRes.message;
      }

      case 'StellarTxOpRequest': {
        const { type, ...op } = operations[index];
        const nextRes = await this.device.commands.typedCall(
          type,
          ['StellarTxOpRequest', 'StellarSorobanDataRequest', 'StellarSignedTx'],
          op
        );
        return this.processTxRequest(nextRes, operations, index + 1);
      }

      default:
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `unexpected response type: ${response.type}`
        );
    }
  };

  async run() {
    const response = await this.device.commands.typedCall('StellarSignTx', 'StellarTxOpRequest', {
      ...this.params,
    });

    return this.processTxRequest(response, this.operations, 0);
  }
}
