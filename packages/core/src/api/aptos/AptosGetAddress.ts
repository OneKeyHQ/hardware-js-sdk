import { AptosGetAddress as HardwareAptosGetAddress } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { AptosAddress, AptosGetAddressParams } from '../../types';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import sha3 from "js-sha3";
import { hexToBytes } from '../helpers/hexUtils';
const { sha3_256: sha3Hash } = sha3;
export default class AptosGetAddress extends BaseMethod<HardwareAptosGetAddress[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: AptosGetAddressParams) => {
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

  publicKeyToAddress(publicKey: string) {
    const hash = sha3Hash.create();
    hash.update(hexToBytes(publicKey));
    hash.update("\x00");
    return hash.hex();
  }

  async run() {
    if (this.hasBundle && supportBatchPublicKey(this.device?.features)) {
      // @ts-expect-error
      const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
        paths: this.params,
        ecdsa_curve_name: 'ed25519',
      });
      // @ts-expect-error
      const result =  res.message.public_keys.map((publicKey: string, index: number) => ({
        path: serializedPath((this.params as unknown as any[])[index].address_n),
        publicKey,
        address: this.publicKeyToAddress(publicKey),
      }));
      return Promise.resolve(result);
    }

    const responses: AptosAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('AptosGetAddress', 'AptosAddress', {
        ...param,
      });

      const { address } = res.message;

      responses.push({
        path: serializedPath(param.address_n),
        address,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
