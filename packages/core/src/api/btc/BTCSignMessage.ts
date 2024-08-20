import { SignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';
import { getBitcoinForkVersionRange } from './helpers/versionLimit';

export default class BTCSignMessage extends BaseMethod<SignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'coin', type: 'string' },
      { name: 'noScriptType', type: 'boolean' },
      { name: 'dAppSignType', type: 'string' },
    ]);

    const { path, messageHex, coin, noScriptType: _noScriptType, dAppSignType } = this.payload;

    let noScriptType = _noScriptType;
    let isBip322Simple = false;

    const addressN = validatePath(path);

    const { coinName, scriptType } = getCoinAndScriptType(addressN, coin, false);
    let finalScriptType: undefined | typeof scriptType = scriptType;

    if (dAppSignType === 'ecdsa' || dAppSignType === 'bip322-simple') {
      if (dAppSignType === 'ecdsa') {
        noScriptType = true;
      } else {
        isBip322Simple = true;
        noScriptType = false;
      }
    } else {
      finalScriptType = noScriptType ? undefined : scriptType;
    }

    this.params = {
      address_n: addressN,
      message: formatAnyHex(messageHex),
      coin_name: coinName,
      script_type: finalScriptType,
      no_script_type: noScriptType,
      is_bip322_simple: isBip322Simple,
    };
  }

  getVersionRange() {
    return getBitcoinForkVersionRange([this.params.coin_name]);
  }

  async run() {
    const res = await this.device.commands.typedCall('SignMessage', 'MessageSignature', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
