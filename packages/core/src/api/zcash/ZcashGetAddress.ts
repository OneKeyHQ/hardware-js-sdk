import { ZcashAddressScope, ZcashAddressType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { serializedPath, toHardened, validatePath } from '../helpers/pathUtils';
import { invalidParameter, validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';

import type { ZcashGetAddress as HardwareZcashGetAddress } from '@onekeyfe/hd-transport';
import type { ZcashGetAddressParams, ZcashAddress } from '../../types/api/zcashGetAddress';
import type { DeviceFirmwareRange } from '../../types';

export default class ZcashGetAddress extends BaseMethod<HardwareZcashGetAddress[]> {
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

    this.params = [];
    payload.bundle.forEach((batch: ZcashGetAddressParams) => {
      // ZIP-32 account path: m/32'/133'/account'
      const addressN = validatePath(batch.path, 3);
      if (
        addressN.length !== 3 ||
        addressN[0] !== toHardened(32) ||
        addressN[1] !== toHardened(133) ||
        addressN[2] < toHardened(0) ||
        addressN[2] > 0xffffffff
      ) {
        throw invalidParameter("Zcash requires a ZIP-32 account path m/32'/133'/account'");
      }
      const addressType = batch.addressType ?? ZcashAddressType.UNIFIED_ORCHARD_P2PKH;
      const scope = batch.scope ?? ZcashAddressScope.EXTERNAL;
      const diversifierIndex = batch.diversifierIndex ?? 0;
      if (
        ![
          ZcashAddressType.UNIFIED_ORCHARD_P2PKH,
          ZcashAddressType.TRANSPARENT_P2PKH,
          ZcashAddressType.UNIFIED_ORCHARD,
        ].includes(addressType) ||
        ![ZcashAddressScope.EXTERNAL, ZcashAddressScope.INTERNAL].includes(scope)
      ) {
        throw invalidParameter('Invalid Zcash address type or scope');
      }
      const maxIndex = addressType === ZcashAddressType.UNIFIED_ORCHARD ? 0xffffffff : 0x7fffffff;
      if (
        !Number.isSafeInteger(diversifierIndex) ||
        diversifierIndex < 0 ||
        diversifierIndex > maxIndex
      ) {
        throw invalidParameter('Invalid Zcash diversifier index');
      }

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'includeUfvk', type: 'boolean' },
        { name: 'includeSeedFingerprint', type: 'boolean' },
      ]);

      this.params.push({
        address_n: addressN,
        address_type: addressType,
        scope,
        diversifier_index: diversifierIndex,
        show_display: batch.showOnOneKey ?? true,
        include_ufvk: batch.includeUfvk ?? false,
        include_seed_fingerprint: batch.includeSeedFingerprint ?? false,
      });
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
    const responses: ZcashAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('ZcashGetAddress', 'ZcashAddress', {
        ...param,
      });

      const path = serializedPath(param.address_n);
      responses.push({
        path,
        address: res.message.address,
        ufvk: res.message.ufvk,
        seedFingerprint: res.message.seed_fingerprint,
      });

      this.postPreviousAddressMessage({
        address: res.message.address,
        path,
      });
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
