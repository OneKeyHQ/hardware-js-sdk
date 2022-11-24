import { SuiGetAddress as HardwareSuiGetAddress } from '@onekeyfe/hd-transport';

import { sha3_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { SuiAddress, SuiGetAddressParams } from '../../types';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { hexToBytes } from '../helpers/hexUtils';

export default class SuiGetAddress extends BaseMethod<HardwareSuiGetAddress[]> {
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
    payload.bundle.forEach((batch: SuiGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
      });
    });
  }

  publicKeyToAddress(publicKey: string) {
    const tmp = new Uint8Array(32 + 1);
    tmp.set([0x00]);
    // tmp.set([0x01]); Secp256k1
    tmp.set(hexToBytes(publicKey), 1);
    const address = sha3_256(tmp).slice(0, 20);
    return `0x${bytesToHex(address)}`;
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.9.0',
      },
      model_touch: {
        min: '3.5.0',
      },
    };
  }

  async run() {
    if (this.hasBundle && supportBatchPublicKey(this.device?.features)) {
      const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
        paths: this.params,
        ecdsa_curve_name: 'ed25519',
      });
      const result = res.message.public_keys.map((publicKey: string, index: number) => ({
        path: serializedPath((this.params as unknown as any[])[index].address_n),
        publicKey,
        address: this.publicKeyToAddress(publicKey),
      }));
      return Promise.resolve(result);
    }

    const responses: SuiAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('SuiGetAddress', 'SuiAddress', {
        ...param,
      });

      const { address } = res.message;

      responses.push({
        path: serializedPath(param.address_n),
        address: address?.toLowerCase(),
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
