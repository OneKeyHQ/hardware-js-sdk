import { EDeviceType } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import { getLatestFirmwareField } from '../utils/deviceFeaturesUtils';
import { DataManager } from '../data-manager';
import { findLatestRelease } from '../utils/release';

import type { CheckFirmwareTypeAvailableParams } from '../types/api/checkFirmwareTypeAvailable';

export default class CheckFirmwareTypeAvailable extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  run() {
    const payload = this.payload as CheckFirmwareTypeAvailableParams;
    const { deviceType, firmwareType } = payload;
    if (deviceType === EDeviceType.Unknown) {
      return Promise.resolve(undefined);
    }

    const latestFirmwareField = getLatestFirmwareField(firmwareType);

    const releaseInfos = DataManager.deviceMap[deviceType]?.[latestFirmwareField] ?? [];
    const releaseInfo = findLatestRelease(releaseInfos);
    return Promise.resolve(releaseInfo);
  }
}
