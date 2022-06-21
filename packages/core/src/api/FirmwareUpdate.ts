import { ERRORS } from '../constants';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { getBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { getDeviceType } from '../utils';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  btcOnly?: boolean;
  baseUrl?: string;
};

export default class FirmwareUpdate extends BaseMethod<Params> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [UI_REQUEST.BOOTLOADER];

    const { payload } = this;

    validateParams(payload, [
      { name: 'version', type: 'array' },
      { name: 'btcOnly', type: 'boolean' },
      { name: 'baseUrl', type: 'string' },
      { name: 'binary', type: 'buffer' },
    ]);

    if ('version' in payload) {
      this.params = {
        version: payload.version,
        btcOnly: payload.btcOnly,
        baseUrl: payload.baseUrl || 'https://onekey-asset.com/onekey',
      };
    }

    if ('binary' in payload) {
      this.params = {
        ...this.params,
        binary: payload.binary,
      };
    }
  }

  async run() {
    const { device, params } = this;

    let binary;

    try {
      if (params.binary) {
        binary = this.params.binary;
      } else {
        // const firmaware = await getBinary({
        //   features: device.features,
        //   releases: DataManager.deviceMap[getDeviceType(this.device.features)],
        //   version: params.version,
        //   btcOnly: params.btcOnly,
        // });
        // binary = firmware.binary;
      }
    } catch (err) {
      throw ERRORS.TypedError(
        'Method_FirmwareUpdate_DownloadFailed',
        'Failed to download firmware binary'
      );
    }

    return Promise.resolve(1);
  }
}
