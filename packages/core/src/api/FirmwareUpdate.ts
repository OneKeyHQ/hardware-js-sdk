import {
  EFirmwareType,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  createDeferred,
} from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { getBinary } from './firmware/getBinary';
import { uploadFirmware } from './firmware/uploadFirmware';
import { createUiMessage } from '../events';
import { DeviceModelToTypes, type KnownDevice } from '../types';
import { isEnteredManuallyBoot } from './firmware/bootloaderHelper';
import { LoggerNames, getLogger, wait } from '../utils';
import { DataManager } from '../data-manager';
import { DevicePool } from '../device/DevicePool';

import type { Deferred } from '@onekeyfe/hd-shared';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
};

const Log = getLogger(LoggerNames.Method);

export default class FirmwareUpdate extends BaseMethod<Params> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
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

  checkDeviceToBootloader(connectId: string | undefined) {
    this.checkPromise = createDeferred();
    const env = DataManager.getSettings('env');
    const isBleReconnect = connectId && DataManager.isBleConnect(env);

    Log.log('FirmwareUpdate [checkDeviceToBootloader] isBleReconnect: ', isBleReconnect);

    // check device goto bootloader mode
    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(
      async () => {
        if (isBleReconnect) {
          try {
            await this.device.deviceConnector?.acquire(
              this.device.originalDescriptor.id,
              null,
              true
            );
            await this.device.initialize();
            if (this.device.isBootloader()) {
              clearInterval(intervalTimer);
              this.checkPromise?.resolve(true);
            }
          } catch (e) {
            // ignore error because of device is not connected
            Log.log('catch Bluetooth error when device is restarting: ', e);
          }
        } else {
          const deviceDiff = await this.device.deviceConnector?.enumerate();
          const devicesDescriptor = deviceDiff?.descriptors ?? [];
          const { deviceList } = await DevicePool.getDevices(devicesDescriptor, connectId);

          if (deviceList.length === 1 && deviceList[0]?.isBootloader()) {
            // should update current device from cache
            // because device was reboot and had some new requests
            this.device.updateFromCache(deviceList[0]);
            this.device.commands.disposed = false;

            clearInterval(intervalTimer);
            this.checkPromise?.resolve(true);
          }
        }
      },
      isBleReconnect ? 3000 : 2000
    );

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
    const deviceType = device.getCurrentDeviceType();

    if (!device.isBootloader() && features) {
      const serialNo = device.getCurrentSerialNo();
      // should go to bootloader mode manually
      if (isEnteredManuallyBoot(features, params.updateType)) {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot));
      }

      // auto go to bootloader mode
      try {
        this.postTipMessage('AutoRebootToBootloader');
        const bootRes = await commands.typedCall('DeviceBackToBoot', 'Success');
        // @ts-expect-error
        if (bootRes.type === 'CallMethodError') {
          throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
        }
        this.postTipMessage('GoToBootloaderSuccess');
        this.checkDeviceToBootloader(this.payload.connectId);

        // force clean classic device cache so that the device can initialize again
        if (DeviceModelToTypes.model_classic.includes(deviceType)) {
          DevicePool.clearDeviceCache(serialNo);
        }
        delete DevicePool.devicesCache[''];
        await this.checkPromise?.promise;
        this.checkPromise = null;
        /**
         * Touch 1 with bootloader v2.5.0 issue: BLE chip need more time for looking up name, here change the delay time to 3000ms after rebooting.
         */
        const isTouch = DeviceModelToTypes.model_touch.includes(deviceType);
        await wait(isTouch ? 3000 : 1500);
      } catch (e) {
        if (e instanceof HardwareError) {
          return Promise.reject(e);
        }
        Log.log('auto go to bootloader mode failed: ', e);
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure)
        );
      }
    }

    let binary: ArrayBuffer | undefined;
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
          firmwareType: EFirmwareType.Universal,
        });
        binary = firmware.binary;
        this.postTipMessage('DownloadFirmwareSuccess');
      }
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (!binary) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'Firmware binary is unavailable'
      );
    }

    await this.device.acquire();

    const response = await uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: binary, rebootOnSuccess: this.payload.rebootOnSuccess },
      false
    );

    if (this.connectId) {
      DevicePool.clearDeviceCache(this.connectId);
    }

    return response;
  }
}
