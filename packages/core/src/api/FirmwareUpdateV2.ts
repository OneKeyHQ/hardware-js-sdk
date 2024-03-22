import {
  createDeferred,
  Deferred,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
} from '@onekeyfe/hd-shared';
import semver from 'semver';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary, getInfo, getSysResourceBinary } from './firmware/getBinary';
import { updateResources, uploadFirmware } from './firmware/uploadFirmware';
import { getDeviceType, getDeviceUUID, wait, getLogger, LoggerNames } from '../utils';
import { createUiMessage } from '../events/ui-request';
import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';
import { getDeviceFirmwareVersion } from '../utils/deviceFeaturesUtils';

import type { KnownDevice, Features } from '../types';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
};

const Log = getLogger(LoggerNames.Method);

export default class FirmwareUpdateV2 extends BaseMethod<Params> {
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
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'platform', type: 'string', required: true },
    ]);

    if (!payload.updateType) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'updateType is required'
      );
    }

    this.params = {
      updateType: payload.updateType,
      forcedUpdateRes: payload.forcedUpdateRes,
      isUpdateBootloader: payload.isUpdateBootloader,
    };

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

    Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isBleReconnect: ', isBleReconnect);

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
            if (this.device.features?.bootloader_mode) {
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

          if (deviceList.length === 1 && deviceList[0]?.features?.bootloader_mode) {
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

  isEnteredManuallyBoot(features: Features) {
    const deviceType = getDeviceType(features);
    const isMini = deviceType === 'mini';
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === 'classic' &&
      features.bootloader_version === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = getDeviceType(features);
    const isTouchMode = deviceType === 'touch' || deviceType === 'pro';
    const currentVersion = getDeviceFirmwareVersion(features).join('.');

    return isTouchMode && semver.gte(currentVersion, '3.2.0');
  }

  /**
   * Check the version number of Touch to determine if it
   * needs to be upgraded via the desktop
   */
  checkVersionForCopyTouchResource(features?: Features) {
    if (!features) return;
    const deviceType = getDeviceType(features);
    const currentVersion = getDeviceFirmwareVersion(features).join('.');
    const targetVersion = this.params.version?.join('.');
    const { updateType } = this.params;

    const releaseInfo = getInfo({ features, updateType });
    if (!releaseInfo) return;
    const { fullResourceRange } = releaseInfo;
    if (!fullResourceRange) return;

    const [minVersion, limitVersion] = fullResourceRange;
    if (deviceType === 'touch' && updateType === 'firmware' && targetVersion) {
      if (
        semver.lt(currentVersion, minVersion) &&
        semver.gte(targetVersion, limitVersion) &&
        this.payload.platform !== 'desktop'
      ) {
        throw ERRORS.TypedError(HardwareErrorCode.UseDesktopToUpdateFirmware);
      }
    }
  }

  async run() {
    const { device, params } = this;
    const { features, commands } = device;
    const deviceType = getDeviceType(features);

    this.checkVersionForCopyTouchResource(features);

    if (!features?.bootloader_mode && features) {
      const uuid = getDeviceUUID(features);
      // should go to bootloader mode manually
      if (this.isEnteredManuallyBoot(features)) {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot));
      }

      // check & upgrade firmware resource
      if (features && this.isSupportResourceUpdate(features, params.updateType)) {
        this.postTipMessage('CheckLatestUiResource');
        const resourceUrl = DataManager.getSysResourcesLatestRelease(
          features,
          params.forcedUpdateRes
        );
        if (resourceUrl) {
          this.postTipMessage('DownloadLatestUiResource');
          const resource = await getSysResourceBinary(resourceUrl);
          this.postTipMessage('DownloadLatestUiResourceSuccess');
          if (resource) {
            await updateResources(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              resource.binary
            );
          }
        }
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
          DevicePool.clearDeviceCache(uuid);
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
        console.log('auto go to bootloader mode failed: ', e);
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure)
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
          isUpdateBootloader: params.isUpdateBootloader,
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
