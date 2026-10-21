import { StarknetPrivacyViewingKeyDerivation, StarknetPublicKeyType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { validatePath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { formatHexResult, toEnumValue, toFeltHex } from './normalize';

import type { StarknetExportPrivacyViewingKey as HardwareStarknetExportPrivacyViewingKey } from '@onekeyfe/hd-transport';
import type {
  StarknetExportPrivacyViewingKeyParams,
  StarknetPrivacyViewingKey,
} from '../../types/api/starknetExportPrivacyViewingKey';
import type { DeviceFirmwareRange } from '../../types';

export default class StarknetExportPrivacyViewingKey extends BaseMethod<HardwareStarknetExportPrivacyViewingKey> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'chainId', required: true },
      { name: 'accountAddress', required: true },
      { name: 'poolAddress', required: true },
    ]);

    const payload = this.payload as StarknetExportPrivacyViewingKeyParams;
    this.params = {
      address_n: validatePath(payload.path, 3),
      public_key_type: toEnumValue(
        payload.publicKeyType,
        StarknetPublicKeyType,
        StarknetPublicKeyType.STARK,
        'publicKeyType'
      ),
      chain_id: toFeltHex(payload.chainId, 'chainId'),
      account_address: toFeltHex(payload.accountAddress, 'accountAddress'),
      pool_address: toFeltHex(payload.poolAddress, 'poolAddress'),
      derivation_version: toEnumValue(
        payload.derivationVersion,
        StarknetPrivacyViewingKeyDerivation,
        StarknetPrivacyViewingKeyDerivation.STARKNET_PRIVACY_VIEWING_KEY_DERIVATION_ACCOUNT_LEAF_V1,
        'derivationVersion'
      ),
    };
  }

  getVersionRange(): DeviceFirmwareRange {
    return {
      model_pro2: {
        min: '0.0.0',
      },
    };
  }

  async run(): Promise<StarknetPrivacyViewingKey> {
    const res = await this.device.commands.typedCall(
      'StarknetExportPrivacyViewingKey',
      'StarknetPrivacyViewingKey',
      { ...this.params }
    );

    const result = { viewingKey: formatHexResult(res.message.viewing_key) };
    validateResult(result, ['viewingKey']);
    return result;
  }
}
