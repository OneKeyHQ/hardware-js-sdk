import { createDeferred, Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary } from './firmware/getBinary';
import { uploadFirmware } from './firmware/uploadFirmware';
import { getDeviceType, getDeviceUUID, wait } from '../utils';
import { createUiMessage } from '../events/ui-request';
import type { KnownDevice, Features } from '../types';

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

  postTipMessage = (message: string) => {
    this.postMessage(
      createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
        device: this.device.toMessageObject() as KnownDevice,
        data: {
          message,
        },
      })
    );
  };

  checkDeviceToBootloader() {
    this.checkPromise = createDeferred();

    // check device goto bootloader mode
    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(async () => {
      const deviceDiff = await this.device.deviceConnector?.enumerate();
      const devicesDescriptor = deviceDiff?.descriptors ?? [];
      const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId);
      console.log('device list: ', deviceList);
      if (deviceList.length === 1 && deviceList[0].features?.bootloader_mode) {
        // should update current device from cache
        // because device was reboot and had some new requests
        this.device.updateFromCache(deviceList[0]);
        this.device.commands.disposed = false;

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
      const uuid = getDeviceUUID(features as Features);
      const deviceType = getDeviceType(features);
      // mini should go to bootloader mode manually
      if (deviceType === 'mini') {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceUnexpectedBootloaderMode));
      }

      // auto go to bootloader mode
      try {
        this.postTipMessage('AutoRebootToBootloader');
        await commands.typedCall('BixinReboot', 'Success');
        this.postTipMessage('GoToBootloaderSuccess');
        this.checkDeviceToBootloader();

        // force clean classic device cache so that the device can initialize again
        if (deviceType === 'classic') {
          DevicePool.clearDeviceCache(uuid);
        }
        delete DevicePool.devicesCache[''];
        await this.checkPromise?.promise;
        this.checkPromise = null;
        await wait(1500);
      } catch (e) {
        console.log('auto go to bootloader mode failed: ', e);
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'go to bootloader mode failed')
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
        this.postTipMessage('DownloadFirmware');
        const firmware = await getBinary({
          features: device.features,
          version: params.version,
          updateType: params.updateType,
        });
        binary = firmware.binary;
        this.postTipMessage('DownloadFirmwareSuccess');
      }
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    await this.device.acquire();

    return uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: binary }
    );
  }
}
