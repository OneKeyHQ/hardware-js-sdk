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

// Firmware accepts up to 512 bytes per chunk; 1 byte = 2 hex chars
const SOROBAN_CHUNK_BYTES = 512;
const SOROBAN_CHUNK_HEX_CHARS = SOROBAN_CHUNK_BYTES * 2;

export default class StellarSignTransaction extends BaseMethod<HardwareStellarSignTx> {
  operations: any[] = [];

  private sorobanState?: {
    callArgs: string;
    callArgsSent: number;
    auth: string;
    authSent: number;
    ext: string;
    extSent: number;
  };

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

      case 'invokeHostFunctionOneKey': {
        const callArgs = op.callArgsXDRHex ?? '';
        const auth = op.sorobanAuthXDRHex ?? '';

        if (!this.sorobanState) {
          throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'sorobanState not initialized');
        }
        this.sorobanState.callArgs = callArgs;
        this.sorobanState.callArgsSent = Math.min(callArgs.length, SOROBAN_CHUNK_HEX_CHARS);
        this.sorobanState.auth = auth;
        this.sorobanState.authSent = Math.min(auth.length, SOROBAN_CHUNK_HEX_CHARS);

        return {
          type: 'StellarInvokeHostFunctionOp',
          source_account: op.source,
          contract_address: op.contract,
          function_name: op.functionName,
          call_args_xdr_size: callArgs.length / 2,
          call_args_xdr_initial_chunk: callArgs.slice(0, SOROBAN_CHUNK_HEX_CHARS),
          soroban_auth_xdr_size: auth.length / 2,
          soroban_auth_xdr_initial_chunk: auth.slice(0, SOROBAN_CHUNK_HEX_CHARS),
        };
      }

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
      this.sorobanState = {
        callArgs: '',
        callArgsSent: 0,
        auth: '',
        authSent: 0,
        ext: transaction.sorobanDataXDR,
        extSent: 0,
      };
    }

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
      ...(this.sorobanState ? { soroban_data_size: this.sorobanState.ext.length / 2 } : {}),
    };

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
        if (!this.sorobanState) {
          throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'sorobanState not initialized');
        }

        const reqType = response.message.type as number;
        // data_length 是字节数，转为 hex 字符数
        const hexLen = (response.message.data_length as number) * 2;
        let chunk: string;

        switch (reqType) {
          // CALL: invoke contract call_args
          case 0: {
            const { callArgs, callArgsSent } = this.sorobanState;
            chunk = callArgs.slice(callArgsSent, callArgsSent + hexLen);
            this.sorobanState.callArgsSent += chunk.length;
            break;
          }
          // AUTH: soroban authorization entries
          case 1: {
            const { auth, authSent } = this.sorobanState;
            chunk = auth.slice(authSent, authSent + hexLen);
            this.sorobanState.authSent += chunk.length;
            break;
          }
          // EXT: soroban transaction extension data
          case 2: {
            const { ext, extSent } = this.sorobanState;
            chunk = ext.slice(extSent, extSent + hexLen);
            this.sorobanState.extSent += chunk.length;
            break;
          }
          default:
            throw ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              `unknown soroban request type: ${reqType}`
            );
        }

        const sorobanRes = await this.device.commands.typedCall(
          'StellarSorobanDataAck',
          ['StellarSorobanDataRequest', 'StellarSignedTx'],
          { data_xdr: chunk }
        );
        return this.processTxRequest(sorobanRes, operations, index);
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
