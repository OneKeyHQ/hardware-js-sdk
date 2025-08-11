import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import type { CosmosAddress, CosmosGetPublicKeyParams } from '../../types';
import { batchGetPublickeys } from '../helpers/batchGetPublickeys';

export default class CosmosGetPublicKey extends BaseMethod<any> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    if (payload.bundle.length === 0) {
      throw new Error('Bundle is empty');
    }

    // init params
    this.params = [];
    payload.bundle.forEach((batch: CosmosGetPublicKeyParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'curve', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;
      const curveName = batch.curve ?? 'secp256k1';

      if (curveName !== 'secp256k1') {
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
        min: '4.0.0',
      },
    };
  }

  async run() {
    const res = await batchGetPublickeys(this.device, this.params, this.params[0].curve, 118);
    const responses: CosmosAddress[] = res.public_keys.map((publicKey: string, index: number) => ({
      path: serializedPath((this.params as unknown as any[])[index].address_n),
      pub: publicKey,
      publicKey,
    }));

    validateResult(responses, ['pub'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
