import { BaseMethod } from '../BaseMethod';
import { serializedPath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { createMethodInteraction } from '../../protocols/protocol-v2/uiInteraction';
import { validateZcashAccountPath } from './helpers';

import type { ZcashGetFullViewingKey as HardwareZcashGetFullViewingKey } from '@onekeyfe/hd-transport';
import type {
  ZcashFullViewingKey,
  ZcashGetFullViewingKeyParams,
} from '../../types/api/zcashGetFullViewingKey';
import type { DeviceFirmwareRange } from '../../types';

// The device exports the UFVK only after the user confirms it on screen.
export default class ZcashGetFullViewingKey extends BaseMethod<HardwareZcashGetFullViewingKey[]> {
  hasBundle = false;

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;
    // The name matches no Protocol V2 confirmation rule, so the export prompt is declared here.
    this.protocolV2UiInteraction = createMethodInteraction(
      'public-key-confirmation',
      'zcashGetFullViewingKey'
    );

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: ZcashGetFullViewingKeyParams) => {
      validateParams(batch, [{ name: 'path', required: true }]);
      this.params.push({ address_n: validateZcashAccountPath(batch.path) });
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
    // Missing fields stay undefined so validateResult rejects them.
    const responses: Partial<ZcashFullViewingKey>[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall(
        'ZcashGetFullViewingKey',
        'ZcashFullViewingKey',
        { ...param }
      );

      responses.push({
        path: serializedPath(param.address_n),
        ufvk: res.message.ufvk,
      });
    }

    validateResult(responses, ['ufvk'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
