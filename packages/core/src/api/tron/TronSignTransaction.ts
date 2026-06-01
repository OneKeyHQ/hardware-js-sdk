import { isEmpty } from 'lodash';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

import type { TronTransaction } from '../../types/api/tronSignTransaction';
import type { TronSignTx } from '@onekeyfe/hd-transport';
import type { DeviceFirmwareRange } from '../../types';

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

      if (tx.contract.freezeBalanceV2Contract) {
        unSignTx.contract = {
          freeze_balance_v2_contract: {
            frozen_balance: tx.contract.freezeBalanceV2Contract.frozenBalance,
            resource: tx.contract.freezeBalanceV2Contract.resource,
          },
        };
      }

      if (tx.contract.unfreezeBalanceV2Contract) {
        unSignTx.contract = {
          unfreeze_balance_v2_contract: {
            unfreeze_balance: tx.contract.unfreezeBalanceV2Contract.unfreezeBalance,
            resource: tx.contract.unfreezeBalanceV2Contract.resource,
          },
        };
      }

      if (tx.contract.delegateResourceContract) {
        unSignTx.contract = {
          delegate_resource_contract: {
            resource: tx.contract.delegateResourceContract.resource,
            balance: tx.contract.delegateResourceContract.balance,
            receiver_address: tx.contract.delegateResourceContract.receiverAddress,
            lock: tx.contract.delegateResourceContract.lock,
            lock_period: tx.contract.delegateResourceContract.lockPeriod,
          },
        };
      }

      if (tx.contract.unDelegateResourceContract) {
        unSignTx.contract = {
          undelegate_resource_contract: {
            resource: tx.contract.unDelegateResourceContract.resource,
            balance: tx.contract.unDelegateResourceContract.balance,
            receiver_address: tx.contract.unDelegateResourceContract.receiverAddress,
          },
        };
      }

      if (tx.contract.withdrawExpireUnfreezeContract) {
        unSignTx.contract = {
          withdraw_expire_unfreeze_contract: {},
        };
      }

      if (tx.contract.withdrawBalanceContract) {
        unSignTx.contract = {
          withdraw_balance_contract: {
            owner_address: tx.contract.withdrawBalanceContract.ownerAddress,
          },
        };
      }

      if (tx.contract.voteWitnessContract) {
        unSignTx.contract = {
          vote_witness_contract: {
            votes: tx.contract.voteWitnessContract.votes?.map(vote => ({
              vote_address: vote.voteAddress,
              vote_count: vote.voteCount,
            })),
            support: tx.contract.voteWitnessContract.support,
          },
        };
      }

      if (tx.contract.cancelAllUnfreezeV2Contract) {
        unSignTx.contract = {
          cancel_all_unfreeze_v2_contract: {},
        };
      }
    }

    return unSignTx;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

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
      pro2: {
        min: '0.0.0',
        unsupported: true,
      },
      model_mini: {
        min: '2.5.0',
      },
    };
  }

  getFixDataTypeVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.13.0',
      },
      touch: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.12.0',
      },
    };
  }

  checkFixDataTypeSupportVoteWitnessError() {
    const { data } = this.payload;
    const { cancel_all_unfreeze_v2_contract, vote_witness_contract } = this.params.contract;
    this.checkFeatureVersionLimit(
      () => !isEmpty(data) || !!cancel_all_unfreeze_v2_contract || !!vote_witness_contract,
      () => this.getFixDataTypeVersionRange()
    );
  }

  supportDelegateResourceLockPeriodVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.15.0',
      },
      touch: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.13.0',
      },
    };
  }

  checkSupportDelegateContractLockPeriod() {
    const { delegate_resource_contract } = this.params.contract;
    this.checkFeatureVersionLimit(
      () =>
        !!delegate_resource_contract &&
        delegate_resource_contract.lock_period !== undefined &&
        delegate_resource_contract.lock_period !== null,
      () => this.supportDelegateResourceLockPeriodVersionRange()
    );
  }

  async run() {
    this.checkFixDataTypeSupportVoteWitnessError();
    this.checkSupportDelegateContractLockPeriod();

    const response = await this.device.commands.typedCall('TronSignTx', 'TronSignedTx', {
      ...this.params,
    });

    return Promise.resolve(response.message);
  }
}
