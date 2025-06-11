import { AptosSignTx as HardwareAptosSignTx } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class AptosSignTransaction extends BaseMethod<HardwareAptosSignTx> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
      { name: 'transactionType', type: 'number', required: false },
    ]);

    const { path, rawTx, transactionType } = this.payload;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
      tx_type: transactionType,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.6.0',
      },
    };
  }

  getWithDataVersionRange() {
    return {
      pro: {
        min: '4.14.0',
      },
      model_classic1s: {
        min: '3.12.0',
      },
      classic: {
        min: '3.10.0',
      },
    };
  }

  checkWithDataError() {
    const { transactionType } = this.payload;
    this.checkFeatureVersionLimit(
      () => transactionType === 1,
      () => this.getWithDataVersionRange()
    );
  }

  async run() {
    this.checkWithDataError();

    const res = await this.device.commands.typedCall('AptosSignTx', 'AptosSignedTx', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
