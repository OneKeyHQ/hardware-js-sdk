import { EDeviceType, HardwareErrorCode, TypedError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getCoinInfo } from './helpers/btcParamsUtils';

import type { SignPsbt } from '@onekeyfe/hd-transport';

export default class BTCSignPsbt extends BaseMethod<SignPsbt> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    validateParams(this.payload, [
      { name: 'psbt', type: 'hexString', required: true },
      { name: 'coin', type: 'string' },
    ]);

    const { psbt, coin } = this.payload;

    const coinInfo = getCoinInfo(undefined, coin);

    this.params = {
      psbt: formatAnyHex(psbt),
      coin_name: coinInfo.name,
    };
  }

  getVersionRange() {
    return {
      pro: {
        min: '4.9.3',
      },
      model_classic1s: {
        min: '3.10.1',
      },
    };
  }

  async run() {
    try {
      const res = await this.device.commands.typedCall('SignPsbt', 'SignedPsbt', {
        ...this.params,
      });
      return res.message;
    } catch (error) {
      const { message } = error;

      const deviceType = this.device.getCurrentDeviceType();
      if (
        message.includes('PSBT parse failed') &&
        (deviceType === EDeviceType.Classic1s || deviceType === EDeviceType.ClassicPure)
      ) {
        throw TypedError(HardwareErrorCode.BTCPsbtTooManyUtxos, 'PSBT too many utxos', {
          count: 5,
        });
      }

      throw error;
    }
  }
}
