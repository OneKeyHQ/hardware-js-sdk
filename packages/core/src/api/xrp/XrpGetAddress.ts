import { deriveAddress } from 'ripple-keypairs';
import { UI_REQUEST } from '../../constants/ui-request';
import { XrpAddress, XrpGetAddressParams } from '../../types/api/xrpGetAddress';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { batchGetPublickeys } from '../helpers/batchGetPublickeys';

export default class XrpGetAddress extends BaseMethod<
  {
    address_n: number[];
    show_display: boolean;
  }[]
> {
  hasBundle = false;

  shouldConfirm = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.shouldConfirm = this.hasBundle
      ? this.payload.bundle.some((i: any) => !!i.showOnOneKey)
      : false;

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: XrpGetAddressParams) => {
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
        min: '2.9.0',
      },
    };
  }

  async run() {
    if (this.hasBundle && supportBatchPublicKey(this.device?.features) && !this.shouldConfirm) {
      const res = await batchGetPublickeys(this.device, this.params, 'secp256k1', 144);
      const result = res.public_keys.map((publicKey: string, index: number) => ({
        path: serializedPath((this.params as unknown as any[])[index].address_n),
        address: deriveAddress(publicKey),
        publicKey,
        pub: publicKey,
      }));

      validateResult(result, ['address', 'publicKey'], {
        expectedLength: this.params.length,
      });

      return Promise.resolve(result);
    }

    const responses: XrpAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('RippleGetAddress', 'RippleAddress', {
        ...param,
      });
      const publicKey = await this.device.commands.typedCall(
        'BatchGetPublickeys',
        'EcdsaPublicKeys',
        {
          paths: [{ address_n: param.address_n }],
          ecdsa_curve_name: 'secp256k1',
        }
      );

      const { address } = res.message;

      const path = serializedPath(param.address_n);
      responses.push({
        path,
        address,
        publicKey: publicKey.message?.public_keys?.[0],
        pub: publicKey.message?.public_keys?.[0],
      });

      this.postPreviousAddressMessage({
        path,
        address,
      });
    }

    validateResult(responses, ['address', 'pub'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
