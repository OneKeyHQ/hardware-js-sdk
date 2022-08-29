import { SolanaSignTx as HardwareSolanaSignTx } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { SolanaSignedTx, SolanaSignTransactionParams } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';

export default class SolSignTransaction extends BaseMethod<HardwareSolanaSignTx[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: SolanaSignTransactionParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'rawTx', type: 'hexString', required: true },
      ]);

      this.params.push({
        address_n: addressN,
        raw_tx: formatAnyHex(batch.rawTx),
      });
    });
  }

  getVersionRange() {
    return {
      classic: {
        min: '2.1.9',
      },
      mini: {
        min: '2.1.9',
      },
    };
  }

  async run() {
    const responses: SolanaSignedTx[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      // @ts-expect-error
      const res = await this.device.commands.typedCall('SolanaSignTx', 'SolanaSignedTx', {
        ...param,
      });

      // @ts-expect-error
      const { signature } = res.message;

      responses.push({
        path: serializedPath(param.address_n),
        signature,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
