import { EthereumGetPublicKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { EVMGetPublicKeyParams, EVMPublicKey } from '../../types/api/evmGetPublicKey';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';

export default class EVMGetPublicKey extends BaseMethod<EthereumGetPublicKey[]> {
  hasBundle = false;

  useBatch = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    this.useBatch = !!this.payload?.useBatch;
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

  async run() {
    const responses: EVMPublicKey[] = [];

    if (this.useBatch && this.hasBundle && supportBatchPublicKey(this.device?.features)) {
      const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
        paths: this.params,
        ecdsa_curve_name: 'secp256k1',
      });
      const result = res.message.public_keys.map((publicKey: string, index: number) => ({
        path: serializedPath((this.params as unknown as any[])[index].address_n),
        publicKey,
      }));
      return Promise.resolve(result);
    }

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall(
        'EthereumGetPublicKey',
        'EthereumPublicKey',
        {
          ...param,
        }
      );

      responses.push({
        path: serializedPath(param.address_n),
        publicKey: res.message.node.public_key,
        ...res.message,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
