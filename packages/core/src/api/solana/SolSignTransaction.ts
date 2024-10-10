import { SolanaSignTx as HardwareSolanaSignTx } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { SolanaSignedTx, SolanaSignTransactionParams } from '../../types';
import { formatAnyHex } from '../helpers/hexUtils';

export default class SolSignTransaction extends BaseMethod<HardwareSolanaSignTx[]> {
  preCheckVersionLimit = true;

  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
    if (this.existsVersionedTx()) {
      return {
        model_mini: {
          min: '3.1.0',
        },
        model_touch: {
          min: '4.3.0',
        },
      };
    }

    return {
      classic: {
        min: '2.1.9',
      },
      mini: {
        min: '2.1.9',
      },
    };
  }

  isVersionedTx(hexString: string) {
    if (hexString.length === 0) return false;
    try {
      const cleanHexString = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
      const binary = parseInt(cleanHexString[0], 16).toString(2);

      // Check highest bit
      return binary[0] === '1';
    } catch {
      return false;
    }
  }

  existsVersionedTx() {
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];
      const { raw_tx } = param;
      if (this.isVersionedTx(raw_tx)) {
        return true;
      }
    }
    return false;
  }

  async run() {
    const responses: SolanaSignedTx[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('SolanaSignTx', 'SolanaSignedTx', {
        ...param,
      });

      const { signature } = res.message;

      responses.push({
        path: serializedPath(param.address_n),
        signature,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
