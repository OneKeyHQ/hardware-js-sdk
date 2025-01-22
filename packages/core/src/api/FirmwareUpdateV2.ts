import { Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary, getInfo, getSysResourceBinary } from './firmware/utils/getBinary';
import { uploadFirmware } from './firmware/uploadFirmware';
import { getDeviceType, getDeviceFirmwareVersion, getDeviceBootloaderVersion } from '../utils';
import { createUiMessage } from '../events/ui-request';
import { DataManager } from '../data-manager';
import { enterBootloaderMode } from './firmware/utils/bootloaderHelper';
import { NEW_BOOT_UPRATE_FIRMWARE_VERSION } from './firmware/utils/const';

import type { KnownDevice, Features } from '../types';
import { updateResourcesInBootloaderMode } from './firmware/uploadResource';

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

  isEnteredManuallyBoot(features: Features) {
    const deviceType = getDeviceType(features);
    const isMini = deviceType === 'mini';
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === 'classic' &&
      features.bootloader_version === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  // only support resource update with touch and pro device
  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;
    const deviceType = getDeviceType(features);
    const isTouchMode = deviceType === 'touch' || deviceType === 'pro';
    const currentFirmwareVersion = getDeviceFirmwareVersion(features).join('.');

    const currentBootloaderVersion = getDeviceBootloaderVersion(features).join('.');
    return (
      isTouchMode &&
      semver.gte(currentFirmwareVersion, '3.2.0') &&
      semver.gte(currentBootloaderVersion, NEW_BOOT_UPRATE_FIRMWARE_VERSION)
    );
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
    const { features } = device;

    this.checkVersionForCopyTouchResource(features);

    // firmware
    let binary;
    // png, font ... resource
    let resource;

    // download firmware
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

    // download resource
    if (features && this.isSupportResourceUpdate(features, params.updateType)) {
      this.postTipMessage('CheckLatestUiResource');
      const resourceUrl = DataManager.getSysResourcesLatestRelease(
        features,
        params.forcedUpdateRes
      );
      if (resourceUrl) {
        this.postTipMessage('DownloadLatestUiResource');
        resource = await getSysResourceBinary(resourceUrl);
        this.postTipMessage('DownloadLatestUiResourceSuccess');
      }
    }

    // enter bootloader mode
    if (!features?.bootloader_mode && features) {
      // Check if manual boot is required
      if (this.isEnteredManuallyBoot(features)) {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot));
      }
      // Enter bootloader mode
      await enterBootloaderMode(this.device, this.postMessage, this.payload.connectId);
    }

    await this.device.acquire();

    // Handle resource updates if needed
    // Only support resource update with touch and pro device
    // update resource
    if (resource) {
      await updateResourcesInBootloaderMode(this.postMessage, device, resource.binary);
    }

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
