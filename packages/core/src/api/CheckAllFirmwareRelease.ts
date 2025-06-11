import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';

import {
  getBleFirmwareReleaseInfo,
  getBootloaderReleaseInfo,
  getFirmwareReleaseInfo,
} from './firmware/releaseHelper';
import { getBridgeReleaseInfo } from '../utils/bridgeUpdate';
import {
  AllFirmwareRelease,
  CheckAllFirmwareReleaseParams,
} from '../types/api/checkAllFirmwareRelease';
import { getDeviceFirmwareVersion, getDeviceType } from '../utils';

export default class CheckAllFirmwareRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { features } = this.device;
    const { checkBridgeRelease } = this.payload as CheckAllFirmwareReleaseParams;

    if (!features) {
      return Promise.resolve(null);
    }

    const firmwareRelease = getFirmwareReleaseInfo(features);

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
    const bootloaderRelease = getBootloaderReleaseInfo(features, willUpdateFirmwareVersion);
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
    } as AllFirmwareRelease;
  }
}
