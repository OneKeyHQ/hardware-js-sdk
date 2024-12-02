import { BenfenGetAddress as HardwareBenfenGetAddress } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { UI_REQUEST } from '../../constants/ui-request';
import { hex2BfcAddress, publicKeyToAddress } from './normalize';
import { BenfenAddress, BenfenGetAddressParams } from '../../types';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';

export default class BenfenGetAddress extends BaseMethod<HardwareBenfenGetAddress[]> {
  hasBundle = false;

  shouldConfirm = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.shouldConfirm =
      this.payload.showOnOneKey ||
      this.payload.bundle?.some((i: BenfenGetAddressParams) => !!i.showOnOneKey);

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: BenfenGetAddressParams) => {
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

  // getVersionRange() {
  //   return {
  //     model_touch: {
  //       min: '4.12.0',
  //     },
  //   };
  // }

  async run() {
    const supportsBatchPublicKey = supportBatchPublicKey(this.device?.features);
    let responses: BenfenAddress[] = [];

    if (supportsBatchPublicKey) {
      const publicKeyRes = await this.device.commands.typedCall(
        'BatchGetPublickeys',
        'EcdsaPublicKeys',
        {
          paths: this.params,
          ecdsa_curve_name: 'ed25519',
        }
      );

      for (let i = 0; i < this.params.length; i++) {
        const param = this.params[i];
        const publicKey = publicKeyRes.message.public_keys[i];
        let address: string;

        if (this.shouldConfirm) {
          const addressRes = await this.device.commands.typedCall(
            'BenfenGetAddress',
            'Address',
            param
          );
          address = addressRes.message.address;
        } else {
          address = publicKeyToAddress(publicKey);
        }

        const result = {
          path: serializedPath(param.address_n),
          // 将 address 转为BFC格式
          address: hex2BfcAddress(address),
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
          const res = await this.device.commands.typedCall('BenfenGetAddress', 'Address', param);
          const result = {
            path: serializedPath(param.address_n),
            address: hex2BfcAddress(res.message.address),
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
