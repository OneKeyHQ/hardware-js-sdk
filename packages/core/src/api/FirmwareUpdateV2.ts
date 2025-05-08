import {
  createDeferred,
  Deferred,
  EDeviceType,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
} from '@onekeyfe/hd-shared';
import { OneKeyRebootType } from '@onekeyfe/hd-transport';
import semver from 'semver';
import { UI_REQUEST } from '../constants/ui-request';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary, getInfo, getSysResourceBinary } from './firmware/getBinary';
import { updateResources, uploadFirmware } from './firmware/uploadFirmware';
import {
  getDeviceType,
  getDeviceUUID,
  wait,
  getLogger,
  LoggerNames,
  getDeviceFirmwareVersion,
  getDeviceBootloaderVersion,
} from '../utils';
import { createUiMessage, FirmwareUpdateTipMessage } from '../events/ui-request';
import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';

import type { KnownDevice, Features } from '../types';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
};

const Log = getLogger(LoggerNames.Method);

export default class FirmwareUpdateV2 extends FirmwareUpdateBaseMethod<Params> {
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
    let isFirstCheck = true;
    let checkCount = 0;
    // eslint-disable-next-line prefer-const
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const isTouchOrProDevice =
      getDeviceType(this?.device?.features) === EDeviceType.Touch ||
      getDeviceType(this?.device?.features) === EDeviceType.Pro;

    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(
      async () => {
        checkCount += 1;
        Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isFirstCheck: ', isFirstCheck);
        if (isTouchOrProDevice && isFirstCheck) {
          isFirstCheck = false;
          Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] wait 3000ms');
          await wait(3000);
        }

        if (checkCount > 4 && DataManager.isWebUsbConnect(DataManager.getSettings('env'))) {
          clearInterval(intervalTimer);
          clearTimeout(timeoutTimer);

          try {
            this.postTipMessage(FirmwareUpdateTipMessage.SelectDeviceInBootloaderForWebDevice);
            const confirmed = await this._promptDeviceInBootloaderForWebDevice();
            if (confirmed) {
              await this._checkDeviceInBootloaderMode(connectId, intervalTimer, timeoutTimer);
            }
          } catch (e) {
            Log.log(
              'FirmwareUpdateV2 [checkDeviceToBootloader] promptDeviceInBootloaderForWebDevice failed: ',
              e
            );
            this.checkPromise?.reject(e);
          }
          return;
        }

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
          await this._checkDeviceInBootloaderMode(connectId, intervalTimer, timeoutTimer);
        }
      },
      isBleReconnect ? 3000 : 2000
    );

    // check goto bootloader mode timeout and throw error
    timeoutTimer = setTimeout(() => {
      if (this.checkPromise) {
        clearInterval(intervalTimer);
        this.checkPromise.reject(new Error());
      }
    }, 30000);
  }

  isEnteredManuallyBoot(features: Features) {
    const deviceType = getDeviceType(features);
    const isMini = deviceType === EDeviceType.Mini;
    const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === EDeviceType.Classic &&
      bootloaderVersion === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = getDeviceType(features);
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
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
    if (deviceType === EDeviceType.Touch && updateType === 'firmware' && targetVersion) {
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
    const { features } = device;

    this.checkVersionForCopyTouchResource(features);

    if (!features?.bootloader_mode && features) {
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

      await this.enterBootloaderMode();
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

    // check if the device commands has been disposed
    this.device?.commands?.checkDisposed();

    await this.device.acquire();

    const response = await uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: binary, rebootOnSuccess: true }
    );

    if (this.connectId) {
      DevicePool.clearDeviceCache(this.connectId);
    }

    return response;
  }
}
