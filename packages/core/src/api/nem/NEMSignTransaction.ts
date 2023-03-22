import {
  NEMAggregateModification,
  NEMImportanceTransfer,
  NEMMosaicCreation,
  NEMMosaicDefinition,
  NEMMosaicSupplyChange,
  NEMProvisionNamespace,
  NEMSignTx,
  NEMTransactionCommon,
  NEMTransfer,
} from '@onekeyfe/hd-transport';

import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import {
  NEMAggregateModificationTransaction,
  NEMImportanceTransaction,
  NEMMosaicCreationTransaction,
  NEMProvisionNamespaceTransaction,
  NEMSupplyChangeTransaction,
  NEMTransaction,
  NEMTransferTransaction,
} from '../../types';

const NEM_TRANSFER = 0x0101;
const NEM_COSIGNING = 0x0102;
const NEM_IMPORTANCE_TRANSFER = 0x0801;
const NEM_AGGREGATE_MODIFICATION = 0x1001;
const NEM_MULTISIG_SIGNATURE = 0x1002;
const NEM_MULTISIG = 0x1004;
const NEM_PROVISION_NAMESPACE = 0x2001;
const NEM_MOSAIC_CREATION = 0x4001;
const NEM_SUPPLY_CHANGE = 0x4002;

export default class NEMSignTransaction extends BaseMethod<NEMSignTx> {
  NEM_MOSAIC_LEVY_TYPES: Record<number, string> = {
    1: 'MosaicLevy_Absolute',
    2: 'MosaicLevy_Percentile',
  };

  NEM_SUPPLY_CHANGE_TYPES: Record<number, string> = {
    1: 'SupplyChange_Increase',
    2: 'SupplyChange_Decrease',
  };

  NEM_AGGREGATE_MODIFICATION_TYPES: Record<number, string> = {
    1: 'CosignatoryModification_Add',
    2: 'CosignatoryModification_Delete',
  };

  NEM_IMPORTANCE_TRANSFER_MODES: Record<number, string> = {
    1: 'ImportanceTransfer_Activate',
    2: 'ImportanceTransfer_Deactivate',
  };

  getCommon = (tx: NEMTransaction, address_n?: number[]): NEMTransactionCommon => ({
    address_n,
    // eslint-disable-next-line no-bitwise
    network: (tx.version >> 24) & 0xff,
    timestamp: tx.timeStamp,
    fee: tx.fee,
    deadline: tx.deadline ?? 0,
    signer: address_n ? undefined : tx.signer,
  });

  transferMessage = (tx: NEMTransferTransaction): NEMTransfer => {
    const mosaics = tx.mosaics
      ? tx.mosaics.map(mosaic => ({
          namespace: mosaic.mosaicId.namespaceId,
          mosaic: mosaic.mosaicId.name,
          quantity: mosaic.quantity,
        }))
      : undefined;

    return {
      recipient: tx.recipient,
      amount: tx.amount,
      payload: tx.message ? tx.message.payload : undefined,
      public_key: tx.message && tx.message.type === 0x02 ? tx.message.publicKey : undefined,
      mosaics,
    };
  };

  importanceTransferMessage = (tx: NEMImportanceTransaction): NEMImportanceTransfer => ({
    // @ts-expect-error
    mode: this.NEM_IMPORTANCE_TRANSFER_MODES[tx.importanceTransfer.mode],
    public_key: tx.importanceTransfer.publicKey,
  });

  aggregateModificationMessage = (
    tx: NEMAggregateModificationTransaction
  ): NEMAggregateModification => {
    const modifications = tx.modifications
      ? tx.modifications.map(modification => ({
          type: this.NEM_AGGREGATE_MODIFICATION_TYPES[modification.modificationType],
          public_key: modification.cosignatoryAccount,
        }))
      : undefined;

    return {
      // @ts-expect-error
      modifications,
      relative_change: tx.minCosignatories.relativeChange,
    };
  };

  provisionNamespaceMessage = (tx: NEMProvisionNamespaceTransaction): NEMProvisionNamespace => ({
    namespace: tx.newPart ?? '',
    parent: tx.parent || undefined,
    sink: tx.rentalFeeSink ?? '',
    fee: tx.rentalFee ?? 0,
  });

  mosaicCreationMessage = (tx: NEMMosaicCreationTransaction): NEMMosaicCreation => {
    const { levy } = tx.mosaicDefinition;

    const definition: NEMMosaicDefinition = {
      namespace: tx.mosaicDefinition.id.namespaceId,
      mosaic: tx.mosaicDefinition.id.name,
      // @ts-expect-error
      levy: levy && levy.type ? this.NEM_MOSAIC_LEVY_TYPES[levy.type] : undefined,
      fee: levy && levy.fee,
      levy_address: levy && levy.recipient,
      levy_namespace: levy && levy.mosaicId && levy.mosaicId.namespaceId,
      levy_mosaic: levy && levy.mosaicId && levy.mosaicId.name,
      description: tx.mosaicDefinition.description,
    };

    const { properties } = tx.mosaicDefinition;
    if (Array.isArray(properties)) {
      properties.forEach(property => {
        const { name, value } = property;
        switch (name) {
          case 'divisibility':
            definition.divisibility = parseInt(value);
            break;

          case 'initialSupply':
            definition.supply = parseInt(value);
            break;

          case 'supplyMutable':
            definition.mutable_supply = value === 'true';
            break;

          case 'transferable':
            definition.transferable = value === 'true';
            break;
          default:
        }
      });
    }

    return {
      definition,
      sink: tx.creationFeeSink ?? '',
      fee: tx.creationFee ?? 0,
    };
  };

  supplyChangeMessage = (tx: NEMSupplyChangeTransaction): NEMMosaicSupplyChange => ({
    namespace: tx.mosaicId.namespaceId,
    mosaic: tx.mosaicId.name,
    // @ts-expect-error
    type: this.NEM_SUPPLY_CHANGE_TYPES[tx.supplyType],
    delta: tx.delta ?? 0,
  });

  parseTx = (tx: NEMTransaction, address_n: number[]) => {
    let transaction = tx;
    const message: NEMSignTx = {
      transaction: this.getCommon(tx, address_n),
      transfer: undefined,
      importance_transfer: undefined,
      aggregate_modification: undefined,
      provision_namespace: undefined,
      mosaic_creation: undefined,
      supply_change: undefined,
    };

    if (
      tx.type === NEM_COSIGNING ||
      tx.type === NEM_MULTISIG ||
      tx.type === NEM_MULTISIG_SIGNATURE
    ) {
      message.cosigning = tx.type === NEM_COSIGNING || tx.type === NEM_MULTISIG_SIGNATURE;
      transaction = tx.otherTrans;
      message.multisig = this.getCommon(transaction);
    }

    switch (transaction.type) {
      case NEM_TRANSFER:
        message.transfer = this.transferMessage(transaction);
        break;

      case NEM_IMPORTANCE_TRANSFER:
        message.importance_transfer = this.importanceTransferMessage(transaction);
        break;

      case NEM_AGGREGATE_MODIFICATION:
        message.aggregate_modification = this.aggregateModificationMessage(transaction);
        break;

      case NEM_PROVISION_NAMESPACE:
        message.provision_namespace = this.provisionNamespaceMessage(transaction);
        break;

      case NEM_MOSAIC_CREATION:
        message.mosaic_creation = this.mosaicCreationMessage(transaction);
        break;

      case NEM_SUPPLY_CHANGE:
        message.supply_change = this.supplyChangeMessage(transaction);
        break;

      default:
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          'Unknown transaction type'
        );
    }

    return message;
  };

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'transaction', type: 'object', required: true },
    ]);
    const { path, transaction } = this.payload;
    const addressN = validatePath(path, 3);

    this.params = this.parseTx(transaction, addressN);
  }

  async run() {
    const res = await this.device.commands.typedCall('NEMSignTx', 'NEMSignedTx', {
      ...this.params,
    });

    return Promise.resolve(res);
  }
}
