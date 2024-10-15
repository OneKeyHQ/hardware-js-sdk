import { SuiGetAddress as HardwareSuiGetAddress } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { SuiAddress, SuiGetAddressParams } from '../../types';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { publicKeyToAddress } from './normalize';

export default class SuiGetAddress extends BaseMethod<HardwareSuiGetAddress[]> {
  hasBundle = false;

  shouldConfirm = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.shouldConfirm =
      this.payload.showOnOneKey || this.payload.bundle?.some((i: any) => !!i.showOnOneKey);

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

  getVersionRange() {
    return {
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.3.0',
      },
    };
  }

  async run() {
    const supportsBatchPublicKey = supportBatchPublicKey(this.device?.features);
    let responses: SuiAddress[] = [];
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
            'SuiGetAddress',
            'SuiAddress',
            param
          );
          address = addressRes.message.address?.toLowerCase() ?? '';
        } else {
          address = publicKeyToAddress(publicKey);
        }

        const result: SuiAddress = {
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
          const res = await this.device.commands.typedCall('SuiGetAddress', 'SuiAddress', param);
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
