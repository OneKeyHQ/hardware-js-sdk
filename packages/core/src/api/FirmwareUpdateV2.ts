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
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { updateResources, uploadFirmware } from './firmware/uploadFirmware';
import { getDeviceType, getDeviceUUID, wait, getLogger, LoggerNames } from '../utils';
import { createUiMessage } from '../events/ui-request';
import type { KnownDevice, Features } from '../types';
import { DataManager } from '../data-manager';
import { getDeviceFirmwareVersion } from '../utils/deviceFeaturesUtils';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
};

const Log = getLogger(LoggerNames.Method);

export default class FirmwareUpdateV2 extends BaseMethod<Params> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;

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

    this.params = { updateType: payload.updateType, forcedUpdateRes: payload.forcedUpdateRes };

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
    const isBleReconnect = connectId && env === 'react-native';

    Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isBleReconnect: ', isBleReconnect);

    // check device goto bootloader mode
    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(
      async () => {
        if (isBleReconnect) {
          await this.device.acquire();
          await this.device.initialize();
          if (this.device.features?.bootloader_mode) {
            clearInterval(intervalTimer);
            this.checkPromise?.resolve(true);
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
    const deviceType = getDeviceType(features);
    const currentVersion = getDeviceFirmwareVersion(features).join('.');
    const targetVersion = this.params.version?.join('.');
    const { updateType } = this.params;
    if (deviceType === 'touch' && updateType === 'firmware' && targetVersion) {
      if (
        semver.lt(currentVersion, '3.5.0') &&
        semver.gte(targetVersion, '3.5.0') &&
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
        await commands.typedCall('DeviceBackToBoot', 'Success');
        this.postTipMessage('GoToBootloaderSuccess');
        this.checkDeviceToBootloader(this.payload.connectId);

        // force clean classic device cache so that the device can initialize again
        if (deviceType === 'classic') {
          DevicePool.clearDeviceCache(uuid);
        }
        delete DevicePool.devicesCache[''];
        await this.checkPromise?.promise;
        this.checkPromise = null;
        await wait(1500);
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
