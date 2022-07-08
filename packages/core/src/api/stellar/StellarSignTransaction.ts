import {
  StellarSignedTx,
  StellarSignTx as HardwareStellarSignTx,
} from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { StellarOperation, StellarSignTransactionParams } from '../../types';

export default class StellarSignTransaction extends BaseMethod<HardwareStellarSignTx> {
  operations: any[] = [];

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
      default:
        return {};
    }
  };

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'networkPassphrase', type: 'string', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);

    // init params
    const addressN = validatePath(this.payload.path, 3);
    const { transaction, networkPassphrase } = this.payload as StellarSignTransactionParams;

    this.params = {
      address_n: addressN,
      network_passphrase: networkPassphrase,
      source_account: transaction.source,
      fee: transaction.fee,
      sequence_number: transaction.sequence,
      num_operations: transaction.operations.length,
    };

    if (transaction.timebounds) {
      this.params.timebounds_start = transaction.timebounds.minTime;
      this.params.timebounds_end = transaction.timebounds.maxTime;
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

    console.log('StellarSignTransactionParams', this.params);
    console.log('StellarSignTransactionOperations', this.operations);
  }

  processTxRequest = async (operations: any, index: number): Promise<StellarSignedTx> => {
    const isLastOp = index + 1 >= operations.length;
    const { type, ...op } = operations[index];

    if (isLastOp) {
      const response = await this.device.commands.typedCall(type, 'StellarSignedTx', op);
      return response.message;
    }

    await this.device.commands.typedCall(type, 'StellarTxOpRequest', op);

    return this.processTxRequest(operations, index + 1);
  };

  async run() {
    await this.device.commands.typedCall('StellarSignTx', 'StellarTxOpRequest', { ...this.params });

    return this.processTxRequest(this.operations, 0);
  }
}
