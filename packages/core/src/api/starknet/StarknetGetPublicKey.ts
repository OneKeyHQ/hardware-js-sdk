import { StarknetPublicKeyType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { formatHexResult, toEnumValue } from './normalize';

import type { StarknetGetPublicKey as HardwareStarknetGetPublicKey } from '@onekeyfe/hd-transport';
import type {
  StarknetGetPublicKeyParams,
  StarknetPublicKey,
} from '../../types/api/starknetGetPublicKey';
import type { DeviceFirmwareRange } from '../../types';

export default class StarknetGetPublicKey extends BaseMethod<HardwareStarknetGetPublicKey[]> {
  hasBundle = false;

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = payload.bundle.map((batch: StarknetGetPublicKeyParams) => {
      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);

      return {
        address_n: validatePath(batch.path, 3),
        show_display: batch.showOnOneKey ?? true,
        type: toEnumValue(
          batch.publicKeyType,
          StarknetPublicKeyType,
          StarknetPublicKeyType.STARK,
          'publicKeyType'
        ),
      };
    });
  }

  getVersionRange(): DeviceFirmwareRange {
    return {
      model_pro2: {
        min: '0.0.0',
      },
    };
  }

  async run() {
    const responses: StarknetPublicKey[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];
      const res = await this.device.commands.typedCall(
        'StarknetGetPublicKey',
        'StarknetPublicKey',
        { ...param }
      );
      responses.push({
        path: serializedPath(param.address_n),
        pub: formatHexResult(res.message.public_key),
      });
    }

    validateResult(responses, ['pub'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
