import { sha3_256 as sha3Hash } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';

import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { hexToBytes } from '../helpers/hexUtils';
import { batchGetPublickeys, supportBatchPublicKeyByDevice } from '../helpers/batchGetPublickeys';

import type { AptosAddress, AptosGetAddressParams } from '../../types';
import type { AptosGetAddress as HardwareAptosGetAddress } from '@onekeyfe/hd-transport';

export default class AptosGetAddress extends BaseMethod<HardwareAptosGetAddress[]> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  hasBundle = false;

  shouldConfirm = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.shouldConfirm =
      this.payload.showOnOneKey ||
      this.payload.bundle?.some((i: AptosGetAddressParams) => !!i.showOnOneKey);

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
    const supportsBatchPublicKey = supportBatchPublicKeyByDevice(this.device);
    let responses: AptosAddress[] = [];
    if (supportsBatchPublicKey) {
      const publicKeyRes = await batchGetPublickeys(this.device, this.params, 'ed25519', 637);

      for (let i = 0; i < this.params.length; i++) {
        const param = this.params[i];
        const publicKey = publicKeyRes.public_keys[i];
        let address: string;

        if (this.shouldConfirm) {
          const addressRes = await this.device.commands.typedCall(
            'AptosGetAddress',
            'AptosAddress',
            param
          );
          address = addressRes.message.address?.toLowerCase() ?? '';
        } else {
          address = this.publicKeyToAddress(publicKey);
        }

        const result: AptosAddress = {
          path: serializedPath(param.address_n),
          address,
          publicKey,
          pub: publicKey,
        };

        if (this.shouldConfirm) {
          this.postPreviousAddressMessage(result);
        }

        responses.push(result);
      }
    } else {
      responses = await Promise.all(
        this.params.map(async param => {
          const res = await this.device.commands.typedCall(
            'AptosGetAddress',
            'AptosAddress',
            param
          );
          const result = {
            path: serializedPath(param.address_n),
            address: res.message.address?.toLowerCase() ?? '',
          };
          if (this.shouldConfirm) {
            this.postPreviousAddressMessage(result);
          }
          return result;
        })
      );
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return this.hasBundle ? responses : responses[0];
  }
}
