import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { UI_REQUEST } from '../../constants/ui-request';
import { BenfenPublicKey, BenfenGetPublicKeyParams } from '../../types';
import { batchGetPublickeys } from '../helpers/batchGetPublickeys';

export default class BenfenGetPublicKey extends BaseMethod<any> {
  hasBundle = false;

  strictCheckDeviceSupport = true;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: BenfenGetPublicKeyParams) => {
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
      pro: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const res = await batchGetPublickeys(this.device, this.params, 'ed25519', 728);

    const responses: BenfenPublicKey[] = res.public_keys.map(
      (publicKey: string, index: number) => ({
        path: serializedPath((this.params as any[])[index].address_n),
        pub: publicKey,
      })
    );

    validateResult(responses, ['pub'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
