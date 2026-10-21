import { StarknetPublicKeyType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { formatHexResult, toEnumValue, toFeltHex, toFeltHexArray } from './normalize';

import type { StarknetGetAddress as HardwareStarknetGetAddress } from '@onekeyfe/hd-transport';
import type { StarknetAddress, StarknetGetAddressParams } from '../../types/api/starknetGetAddress';
import type { DeviceFirmwareRange } from '../../types';

export default class StarknetGetAddress extends BaseMethod<HardwareStarknetGetAddress[]> {
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

    this.params = payload.bundle.map((batch: StarknetGetAddressParams) => {
      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'classHash', required: true },
        { name: 'contractAddressSalt', required: true },
        { name: 'constructorCalldata', type: 'array', required: true, allowEmpty: true },
      ]);

      return {
        address_n: validatePath(batch.path, 3),
        show_display: batch.showOnOneKey ?? true,
        public_key_type: toEnumValue(
          batch.publicKeyType,
          StarknetPublicKeyType,
          StarknetPublicKeyType.STARK,
          'publicKeyType'
        ),
        class_hash: toFeltHex(batch.classHash, 'classHash'),
        contract_address_salt: toFeltHex(batch.contractAddressSalt, 'contractAddressSalt'),
        constructor_calldata: toFeltHexArray(batch.constructorCalldata, 'constructorCalldata'),
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
    const responses: StarknetAddress[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];
      const res = await this.device.commands.typedCall('StarknetGetAddress', 'StarknetAddress', {
        ...param,
      });

      const path = serializedPath(param.address_n);
      const address = formatHexResult(res.message.address);
      responses.push({ path, address });

      this.postPreviousAddressMessage({ address, path });
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
