import { UI_REQUEST } from '../../constants/ui-request';
import { XrpSignTransactionParams } from '../../types/api/xrpSignTransaction';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { validatePath } from '../helpers/pathUtils';

export default class XrpGetAddress extends BaseMethod<XrpSignTransactionParams> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { payload } = this;
    validateParams(payload, [
      { name: 'path', required: true },
      { name: 'transaction', required: true },
    ]);

    const path = validatePath(payload.path, 5);

    const { transaction } = payload;
    validateParams(transaction, [
      { name: 'fee', type: 'string' },
      { name: 'flags', type: 'number' },
      { name: 'sequence', type: 'number' },
      { name: 'maxLedgerVersion', type: 'number' },
      { name: 'payment', type: 'object' },
    ]);
    validateParams(transaction.payment, [
      { name: 'amount', type: 'number', required: true },
      { name: 'destination', type: 'string', required: true },
      { name: 'destinationTag', type: 'number' },
    ]);

    this.params = {
      address_n: path,
      fee: transaction.fee,
      flags: transaction.flags,
      sequence: transaction.sequence,
      last_ledger_sequence: transaction.maxLedgerVersion,
      payment: {
        amount: transaction.payment.amount,
        destination: transaction.payment.destination,
        destination_tag: transaction.payment.destinationTag,
      },
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.9.0',
      },
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'RippleSignTx',
      'RippleSignedTx',
      this.params
    );

    return {
      serializedTx: message.serialized_tx,
      signature: message.signature,
    };
  }
}
