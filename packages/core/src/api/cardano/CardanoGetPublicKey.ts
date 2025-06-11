import { BaseMethod } from '../BaseMethod';
import { PROTO } from '../../constants';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { CardanoPublicKeyParams, CardanoPublicKey } from '../../types/api/cardanoGetPublicKey';

export default class CardanoGetPublicKey extends BaseMethod<CardanoPublicKeyParams[]> {
  hasBundle?: boolean;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = payload.bundle.map((batch: any) => {
      // validate incoming parameters for each batch
      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'derivationType', type: 'number' },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      const path = validatePath(batch.path, 3);
      return {
        address_n: path,
        derivation_type:
          typeof batch.derivationType !== 'undefined'
            ? batch.derivationType
            : PROTO.CardanoDerivationType.ICARUS,
        show_display: typeof batch.showOnOneKey === 'boolean' ? batch.showOnOneKey : false,
      };
    });
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.1.0',
      },
    };
  }

  async run() {
    const responses: CardanoPublicKey[] = [];
    const cmd = this.device.getCommands();
    for (let i = 0; i < this.params.length; i++) {
      const batch = this.params[i];
      const { message } = await cmd.typedCall('CardanoGetPublicKey', 'CardanoPublicKey', batch);
      responses.push({
        path: batch.address_n,
        serializedPath: serializedPath(batch.address_n),
        xpub: message.xpub,
        node: message.node,
      });
    }

    validateResult(responses, ['xpub'], {
      expectedLength: this.params.length,
    });

    return this.hasBundle ? responses : responses[0];
  }
}
