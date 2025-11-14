import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import {
  getBleFirmwareReleaseInfo,
  getBootloaderReleaseInfo,
  getFirmwareReleaseInfo,
} from './firmware/releaseHelper';
import { getBridgeReleaseInfo } from '../utils/bridgeUpdate';
import { getDeviceFirmwareVersion, getDeviceType, getFirmwareType } from '../utils';

import type {
  AllFirmwareRelease,
  CheckAllFirmwareReleaseParams,
} from '../types/api/checkAllFirmwareRelease';

export default class CheckAllFirmwareRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { features } = this.device;
    const { checkBridgeRelease, firmwareType: firmwareTypeParams } = this
      .payload as CheckAllFirmwareReleaseParams;

    if (!features) {
      return Promise.resolve(null);
    }

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = firmwareTypeParams ?? deviceFirmwareType;
    const firmwareRelease = getFirmwareReleaseInfo(features, firmwareType);

    const currentFirmwareVersion = getDeviceFirmwareVersion(features).join('.');
    const willUpdateFirmwareVersion = firmwareRelease.release?.version?.join('.');
    const deviceType = getDeviceType(features);

    let bridgeReleaseInfo = null;
    if (
      checkBridgeRelease &&
      (firmwareRelease.status === 'required' || firmwareRelease.status === 'outdated')
    ) {
      bridgeReleaseInfo = await getBridgeReleaseInfo({
        deviceType,
        currentFirmwareVersion,
        willUpdateFirmwareVersion,
      });
    }
    const bootloaderRelease = getBootloaderReleaseInfo({
      features,
      willUpdateFirmwareVersion,
      firmwareType,
    });
    const bleFirmwareReleaseInfo = getBleFirmwareReleaseInfo(features);

    return {
      firmware: firmwareRelease,
      bootloader: bootloaderRelease,
      ble: bleFirmwareReleaseInfo,
      bridge: bridgeReleaseInfo
        ? {
            shouldUpdate: bridgeReleaseInfo.shouldUpdate,
            status: bridgeReleaseInfo.shouldUpdate ? 'outdated' : 'valid',
            changelog: bridgeReleaseInfo.changelog,
            release: bridgeReleaseInfo.releaseVersion,
          }
        : undefined,
      features,
    } as AllFirmwareRelease;
  }
}
