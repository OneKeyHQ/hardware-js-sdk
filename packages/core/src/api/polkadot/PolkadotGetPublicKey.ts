import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { PolkadotGetPublicKeyParams } from '../../types';

export default class PolkadotGetPublicKey extends BaseMethod<any> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    if (payload.bundle.length === 0) {
      throw new Error('Bundle is empty');
    }

    // init params
    this.params = [];
    payload.bundle.forEach((batch: PolkadotGetPublicKeyParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'curve', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;
      const curveName = batch.curve ?? 'ed25519';

      if (curveName === 'secp256k1') {
        throw new Error('Curve name is not supported');
      }

      this.params.push({
        address_n: addressN,
        curve: curveName,
        show_display: showOnOneKey,
      });
    });
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.10.0',
      },
      model_touch: {
        min: '4.1.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
      paths: this.params,
      ecdsa_curve_name: this.params[0].curve,
    });

    const responses = res.message.public_keys.map((publicKey: string, index: number) => ({
      path: serializedPath((this.params as unknown as any[])[index].address_n),
      publicKey,
    }));

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
