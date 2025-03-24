import { ERRORS, HardwareErrorCode, Deferred } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { getBinary } from './firmware/utils/getBinary';
import { uploadFirmware } from './firmware/uploadFirmware';
import { postProgressTip } from './firmware/utils/uiHelper';
import { enterBootloaderMode, isEnteredManuallyBoot } from './firmware/utils/bootloaderHelper';

import { DevicePool } from '../device/DevicePool';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
};

export default class FirmwareUpdate extends BaseMethod<Params> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.notAllowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    validateParams(payload, [
      { name: 'version', type: 'array' },
      { name: 'binary', type: 'buffer' },
      { name: 'updateType', type: 'string', required: true },
      { name: 'rebootOnSuccess', type: 'boolean' },
    ]);

    this.params = { updateType: payload.updateType };

    if ('version' in payload) {
      this.params = {
        ...this.params,
        version: payload.version,
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
    const { features } = device;

    if (!features?.bootloader_mode && features) {
      // should go to bootloader mode manually
      if (isEnteredManuallyBoot(features, params.updateType)) {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot));
      }

      // auto go to bootloader mode
      await enterBootloaderMode(device, this.postMessage, this.payload.connectId);
    }

    let binary;
    try {
      if (params.binary) {
        binary = this.params.binary;
      } else {
        if (!device.features) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            'no features found for this device'
          );
        }
        postProgressTip(device, 'DownloadFirmware', this.postMessage);
        const firmware = await getBinary({
          features: device.features,
          version: params.version,
          updateType: params.updateType,
        });
        binary = firmware.binary;
        postProgressTip(device, 'DownloadFirmwareSuccess', this.postMessage);
      }
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    await this.device.acquire();

    const response = await uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: binary, rebootOnSuccess: this.payload.rebootOnSuccess }
    );

    if (this.connectId) {
      DevicePool.clearDeviceCache(this.connectId);
    }

    return response;
  }
}
