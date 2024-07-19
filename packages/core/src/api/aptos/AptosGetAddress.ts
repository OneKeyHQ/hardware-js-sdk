import { AptosGetAddress as HardwareAptosGetAddress } from '@onekeyfe/hd-transport';

import { sha3_256 as sha3Hash } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { AptosAddress, AptosGetAddressParams } from '../../types';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { hexToBytes } from '../helpers/hexUtils';

export default class AptosGetAddress extends BaseMethod<HardwareAptosGetAddress[]> {
  hasBundle = false;

  shouldConfirm = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.shouldConfirm = this.hasBundle
      ? this.payload.bundle.some((i: any) => !!i.showOnOneKey)
      : false;

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: AptosGetAddressParams) => {
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
    const hash = sha3Hash.create();
    hash.update(hexToBytes(publicKey));
    hash.update('\x00');
    return `0x${bytesToHex(hash.digest())}`;
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.6.0',
      },
    };
  }

  async run() {
    if (this.hasBundle && supportBatchPublicKey(this.device?.features) && !this.shouldConfirm) {
      const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
        paths: this.params,
        ecdsa_curve_name: 'ed25519',
      });
      const result = res.message.public_keys.map((publicKey: string, index: number) => ({
        path: serializedPath((this.params as unknown as any[])[index].address_n),
        publicKey,
        address: this.publicKeyToAddress(publicKey),
      }));

      validateResult(result, ['address'], {
        expectedLength: this.params.length,
      });

      return Promise.resolve(result);
    }

    const responses: AptosAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('AptosGetAddress', 'AptosAddress', {
        ...param,
      });

      const { address } = res.message;

      const result = {
        path: serializedPath(param.address_n),
        address: address?.toLowerCase(),
      };
      responses.push(result);
      this.postPreviousAddressMessage(result);
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
