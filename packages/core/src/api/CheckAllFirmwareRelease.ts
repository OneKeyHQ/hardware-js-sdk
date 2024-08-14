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

export default class CheckAllFirmwareRelease extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { features } = this.device;
    const { platform } = this.payload as CheckAllFirmwareReleaseParams;

    if (!features) {
      return Promise.resolve(null);
    }

    const firmwareRelease = getFirmwareReleaseInfo(features);
    const willUpdateFirmwareVersion = firmwareRelease.release?.version?.join('.');
    let bridgeReleaseInfo = null;
    if (firmwareRelease.status === 'required' || firmwareRelease.status === 'outdated') {
      if ((platform === 'web' || platform === 'ext') && willUpdateFirmwareVersion) {
        bridgeReleaseInfo = await getBridgeReleaseInfo(features, willUpdateFirmwareVersion);
      }
    }
    const bootloaderRelease = getBootloaderReleaseInfo(features, willUpdateFirmwareVersion);
    const bleFirmwareReleaseInfo = getBleFirmwareReleaseInfo(features);

    return {
      firmware: firmwareRelease,
      bootloader: bootloaderRelease,
      ble: bleFirmwareReleaseInfo,
      bridge: bridgeReleaseInfo
        ? {
            status: bridgeReleaseInfo.shouldUpdate ? 'outdated' : 'valid',
            changelog: bridgeReleaseInfo.changelog,
            release: bridgeReleaseInfo.releaseVersion,
          }
        : undefined,
    } as AllFirmwareRelease;
  }
}
