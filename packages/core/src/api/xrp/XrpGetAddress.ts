import { deriveAddress } from 'ripple-keypairs';
import { UI_REQUEST } from '../../constants/ui-request';
import { XrpAddress, XrpGetAddressParams } from '../../types/api/xrpGetAddress';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { serializedPath, validatePath } from '../helpers/pathUtils';

export default class XrpGetAddress extends BaseMethod<
  {
    address_n: number[];
    show_display: boolean;
  }[]
> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

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
        min: '2.6.0',
      },
    };
  }

  async run() {
    if (this.hasBundle && supportBatchPublicKey(this.device?.features)) {
      const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
        paths: this.params,
        ecdsa_curve_name: 'secp256k1',
      });
      const result = res.message.public_keys.map((publicKey: string, index: number) => ({
        path: serializedPath((this.params as unknown as any[])[index].address_n),
        publicKey,
        address: deriveAddress(publicKey),
      }));
      return Promise.resolve(result);
    }

    const responses: XrpAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('RippleGetAddress', 'RippleAddress', {
        ...param,
      });

      const { address } = res.message;

      responses.push({
        path: serializedPath(param.address_n),
        address,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
