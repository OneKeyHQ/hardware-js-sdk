import { GetPublicKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { getScriptType, isTaprootPath, serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { BTCGetAddressParams } from '../../types/api/btcGetAddress';
import { getCoinInfo } from './helpers/btcParamsUtils';
import { BTCPublicKey } from '../../types/api/btcGetPublicKey';

export default class BTCGetPublicKey extends BaseMethod<GetPublicKey[]> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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

  async run() {
    const responses: BTCPublicKey[] = [];

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

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
