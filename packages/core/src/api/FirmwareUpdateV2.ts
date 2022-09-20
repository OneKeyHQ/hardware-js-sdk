import { createDeferred, Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary } from './firmware/getBinary';
import { uploadFirmware } from './firmware/uploadFirmware';
import { wait } from '../utils';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
};

export default class FirmwareUpdate extends BaseMethod<Params> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;

    const { payload } = this;

    validateParams(payload, [
      { name: 'version', type: 'array' },
      { name: 'binary', type: 'buffer' },
    ]);

    if (!payload.updateType) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'updateType is required'
      );
    }

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

  checkDeviceToBootloader() {
    this.checkPromise = createDeferred();

    // check device goto bootloader mode
    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(async () => {
      const deviceDiff = await this.device.deviceConnector?.enumerate();
      const devicesDescriptor = deviceDiff?.descriptors ?? [];
      const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId);
      console.log(deviceList);
      if (deviceList.length === 1 && deviceList[0].features?.bootloader_mode) {
        clearInterval(intervalTimer);
        this.checkPromise?.resolve(true);
      }
    }, 2000);

    // check goto bootloader mode timeout and throw error
    setTimeout(() => {
      if (this.checkPromise) {
        clearInterval(intervalTimer);
        this.checkPromise.reject(new Error());
      }
    }, 30000);
  }

  async run() {
    const { device, params } = this;
    const { features, commands } = device;

    if (!features?.bootloader_mode) {
      // should go to bootloader mode
      try {
        const response = await commands.typedCall('BixinReboot', 'Success');
        console.log('firmware response: ', response);
        this.checkDeviceToBootloader();
        await this.checkPromise?.promise;
        this.checkPromise = null;
        await wait(1500);
      } catch (e) {
        console.log('firmware response failed: ', e);
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'go to bootloader mode fause')
        );
      }
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
        const firmware = await getBinary({
          features: device.features,
          version: params.version,
          updateType: params.updateType,
        });
        binary = firmware.binary;
      }
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    return uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: binary }
    );
  }
}
