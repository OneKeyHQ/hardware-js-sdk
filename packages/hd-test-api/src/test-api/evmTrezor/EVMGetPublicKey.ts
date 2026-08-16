import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { serializedPath, validatePath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { batchGetPublickeys, supportBatchPublicKeyByDevice } from '../helpers/batchGetPublickeys';
import getPublicKeyLegacyV1 from './legacyV1/getPublicKey';

import type { EVMGetPublicKeyParams, EVMPublicKey } from '@onekeyfe/hd-core';
import type { EthereumGetPublicKey, EthereumGetPublicKeyOneKey } from '@onekeyfe/hd-transport';

export default class EVMGetPublicKey extends BaseMethod<EthereumGetPublicKeyOneKey[]> {
  hasBundle = false;

  confirmShowOnOneKey = false;

  useBatch = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;

    this.confirmShowOnOneKey = this.payload?.bundle?.some(
      (item: EVMGetPublicKeyParams) => !!item.showOnOneKey
    );

    this.useBatch = !this.confirmShowOnOneKey && this.hasBundle && this.payload.useBatch;

    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: EVMGetPublicKeyParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'chainId', type: 'number' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        chain_id: batch.chainId,
      });
    });
  }

  getEvmPublicKey(param: EthereumGetPublicKey) {
    return getPublicKeyLegacyV1({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      param,
    });
  }

  async run() {
    const responses: EVMPublicKey[] = [];

    if (this.useBatch && supportBatchPublicKeyByDevice(this.device)) {
      try {
        const res = await batchGetPublickeys(this.device, this.params, 'secp256k1', 60, {
          includeNode: false,
          ignoreCoinType: true,
        });
        const result = res.public_keys.map((publicKey: string, index: number) => ({
          path: serializedPath((this.params as unknown as any[])[index].address_n),
          pub: publicKey,
          publicKey,
        }));

        validateResult(result, ['pub'], {
          expectedLength: this.params.length,
        });
        return await Promise.resolve(result);
      } catch (e) {
        // ignore error, fallback to single get public key
      }
    }

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.getEvmPublicKey(param);

      responses.push({
        path: serializedPath(param.address_n),
        pub: res.message.node.public_key,
        publicKey: res.message.node.public_key,
        ...res.message,
      });
    }

    validateResult(responses, ['pub'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
