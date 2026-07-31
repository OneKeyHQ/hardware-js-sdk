import { HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { getScriptType, isTaprootPath, serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { getCoinInfo } from './helpers/btcParamsUtils';
import {
  getBitcoinForkSupportedProtocols,
  getBitcoinForkVersionRange,
} from './helpers/versionLimit';
import { batchGetPublickeys } from '../helpers/batchGetPublickeys';
import { createExtendedPublicKey, getVersionBytes } from './helpers/xpubUtils';

import type { BTCPublicKey } from '../../types/api/btcGetPublicKey';
import type { BTCGetAddressParams } from '../../types/api/btcGetAddress';
import type { GetPublicKey } from '@onekeyfe/hd-transport';

export default class BTCGetPublicKey extends BaseMethod<GetPublicKey[]> {
  getSupportedProtocols() {
    return getBitcoinForkSupportedProtocols(this.params?.map(param => param.coin_name) ?? []);
  }

  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = Object.prototype.hasOwnProperty.call(this.payload, 'bundle');
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];

    payload.bundle.forEach((batch: BTCGetAddressParams) => {
      const addressN = validatePath(batch.path, 1);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'coin', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'scriptType', type: 'string' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      const { multisig, coin } = batch;

      let { scriptType } = batch;
      if (!scriptType) {
        scriptType = getScriptType(addressN);
        if (scriptType === 'SPENDMULTISIG' && !multisig) {
          scriptType = 'SPENDADDRESS';
        }
      }

      const coinName = getCoinInfo(addressN, coin).name;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        coin_name: coinName,
        script_type: scriptType || 'SPENDADDRESS',
      });
    });
  }

  private isBtcNetwork(param: GetPublicKey) {
    return param.coin_name === 'Testnet' || param.coin_name === 'Bitcoin';
  }

  getVersionRange() {
    return getBitcoinForkVersionRange(this.params.map(param => param.coin_name));
  }

  async run() {
    let responses: BTCPublicKey[] = [];

    try {
      const existsShowDisplay = this.params.some(param => param.show_display);
      if (existsShowDisplay || !this.hasBundle) {
        throw new Error('Goto getPublickey');
      }

      for (const param of this.params) {
        // init() sets coin_name; keep an empty fallback for the generated optional type.
        const versionBytes = getVersionBytes(param.coin_name ?? '', param.script_type);
        if (!versionBytes) {
          throw new Error(
            `Invalid coinName, not support generate xpub for scriptType: ${param.script_type}`
          );
        }
      }

      const res = await batchGetPublickeys(this.device, this.params, 'secp256k1', 0, {
        includeNode: true,
        ignoreCoinType: true,
      });

      if (!res?.hd_nodes || this.params.length !== res.hd_nodes.length) {
        throw new Error('Invalid response from Publickeys');
      }

      for (let i = 0; i < this.params.length; i++) {
        const param = this.params[i];
        const node = res.hd_nodes[i];

        const path = serializedPath(param.address_n);

        const xpub = createExtendedPublicKey(node, param.coin_name ?? '', param.script_type);

        const rootFingerprint = res.root_fingerprint;

        let xpubSegwit = xpub;
        if (this.isBtcNetwork(param) && isTaprootPath(param.address_n)) {
          // wrap regular xpub into bitcoind native descriptor
          const fingerprint = Number(rootFingerprint || 0)
            .toString(16)
            .padStart(8, '0');
          const descriptorPath = `${fingerprint}${path.substring(1)}`;
          xpubSegwit = `tr([${descriptorPath}]${xpub}/<0;1>/*)`;
        }

        responses.push({
          path,
          node,
          xpub,
          root_fingerprint: rootFingerprint,
          xpubSegwit,
        });
      }
    } catch (error) {
      if (error instanceof HardwareError) {
        const { errorCode } = error;
        if (
          errorCode === HardwareErrorCode.PinCancelled ||
          errorCode === HardwareErrorCode.ActionCancelled ||
          errorCode === HardwareErrorCode.ResponseUnexpectTypeError ||
          errorCode === HardwareErrorCode.PinInvalid
        ) {
          throw error;
        }
      }

      // clear responses
      responses = [];

      for (let i = 0; i < this.params.length; i++) {
        const param = this.params[i];

        const res = await this.device.commands.typedCall('GetPublicKey', 'PublicKey', {
          ...param,
        });

        const response = {
          path: serializedPath(param.address_n),
          ...res.message,
          xpubSegwit: res.message.xpub,
        };

        if (this.isBtcNetwork(param) && isTaprootPath(param.address_n)) {
          // wrap regular xpub into bitcoind native descriptor
          const fingerprint = Number(response.root_fingerprint || 0)
            .toString(16)
            .padStart(8, '0');
          const descriptorPath = `${fingerprint}${response.path.substring(1)}`;
          response.xpubSegwit = `tr([${descriptorPath}]${response.xpub}/<0;1>/*)`;
        }

        responses.push(response);
      }
    }

    validateResult(responses, ['xpub'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
