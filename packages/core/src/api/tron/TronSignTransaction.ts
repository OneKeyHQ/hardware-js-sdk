import { TronSignTx } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { TronTransaction } from '../../types/api/tronSignTransaction';
import { formatAnyHex } from '../helpers/hexUtils';

export default class TronSignTransaction extends BaseMethod<TronSignTx> {
  parseTx(tx: TronTransaction, address_n: number[]): TronSignTx {
    const unSignTx = {
      address_n,
      data: tx.data,
      timestamp: tx.timestamp,
      fee_limit: tx.feeLimit,
      ref_block_bytes: tx.refBlockBytes,
      ref_block_hash: tx.refBlockHash,
      expiration: tx.expiration,
      contract: {},
    };

    if (tx.contract) {
      if (tx.contract.transferContract) {
        unSignTx.contract = {
          transfer_contract: {
            to_address: tx.contract.transferContract.toAddress,
            amount: tx.contract.transferContract.amount,
          },
        };
      }
      if (tx.contract.triggerSmartContract) {
        unSignTx.contract = {
          trigger_smart_contract: {
            contract_address: tx.contract.triggerSmartContract.contractAddress,
            call_value: tx.contract.triggerSmartContract.callValue,
            data: tx.contract.triggerSmartContract.data,
            call_token_value: tx.contract.triggerSmartContract.callTokenValue,
            asset_id: tx.contract.triggerSmartContract.assetId,
          },
        };
      }
    }

    return unSignTx;
  }

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);

    const { path, transaction } = this.payload;
    const addressN = validatePath(path, 3);

    validateParams(transaction, [
      { name: 'refBlockBytes', type: 'hexString', required: true },
      { name: 'refBlockHash', type: 'hexString', required: true },
      { name: 'expiration', type: 'number', required: true },
      { name: 'timestamp', type: 'number', required: true },
      { name: 'contract', type: 'object', required: true },
    ]);

    // init params
    this.params = this.parseTx(formatAnyHex(transaction), addressN);
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.5.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall('TronSignTx', 'TronSignedTx', {
      ...this.params,
    });

    return Promise.resolve(response.message);
  }
}
