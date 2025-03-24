import { Deferred, ERRORS, HardwareErrorCode, EDeviceType } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary, getInfo, getSysResourceBinary } from './firmware/utils/getBinary';
import { uploadFirmware } from './firmware/uploadFirmware';
import { updateResources } from './firmware/uploadResource';
import { getDeviceType, getDeviceFirmwareVersion } from '../utils';
import { DataManager } from '../data-manager';
import { enterBootloaderMode } from './firmware/utils/bootloaderHelper';
import { postProgressTip } from './firmware/utils/uiHelper';
import type { Features } from '../types';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
};

/**
 * @description
 * While device is "pro" or "touch", Update "Firmware" and "Resources" with "emmc" methods.
 *
 * while device is "mini" or "classic". Update "Firmware" Only.
 */
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

  isEnteredManuallyBoot(features: Features) {
    const deviceType = getDeviceType(features);
    const isMini = deviceType === EDeviceType.Mini;
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === EDeviceType.Classic &&
      features.bootloader_version === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  // only support resource update with touch and pro device
  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = getDeviceType(features);
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
    const currentFirmwareVersion = getDeviceFirmwareVersion(features).join('.');

    return isTouchMode && semver.gte(currentFirmwareVersion, '3.2.0');
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

    // reject while isMini || isBoot183ClassicUpBle
    if (!features?.bootloader_mode && features) {
      // should go to bootloader mode manually
      if (this.isEnteredManuallyBoot(features)) {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot));
      }
    }

    // png, font ... resource
    let resource;

    // download firmware
    let firmwareBinary;

    if (features && this.isSupportResourceUpdate(features, params.updateType)) {
      postProgressTip(device, 'CheckLatestUiResource', this.postMessage);
      const resourceUrl = DataManager.getSysResourcesLatestRelease(
        features,
        params.forcedUpdateRes
      );
      if (resourceUrl) {
        postProgressTip(device, 'DownloadLatestUiResource', this.postMessage);
        resource = await getSysResourceBinary(resourceUrl);
        postProgressTip(device, 'DownloadLatestUiResourceSuccess', this.postMessage);
        if (resource) {
          await updateResources(
            this.device.getCommands().typedCall.bind(this.device.getCommands()),
            this.postMessage,
            device,
            resource.binary
          );
        }
      }

      try {
        if (params.binary) {
          firmwareBinary = this.params.binary;
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
            isUpdateBootloader: params.isUpdateBootloader,
          });
          firmwareBinary = firmware.binary;
          postProgressTip(device, 'DownloadFirmwareSuccess', this.postMessage);
        }
      } catch (err) {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
      }
    }

    await enterBootloaderMode(this.device, this.postMessage, this.payload.connectId);

    await this.device.acquire();

    // Handle resource updates if needed
    // Only support resource update with touch and pro device
    // update resource

    const response = await uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: firmwareBinary, rebootOnSuccess: true }
    );

    if (this.connectId) {
      DevicePool.clearDeviceCache(this.connectId);
    }

    return response;
  }
}
