import axios from 'axios';
import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';

import type { IDeviceType } from '../types';

const REQUIRED_BRIDGE_VERSION = '2.2.0';
const TOUCH_NEED_UPDATE_BRIDGE_VERSION = '4.3.0';
const CLASSIC_MINI_NEED_UPDATE_BRIDGE_VERSION = '3.1.0';

export async function getBridgeReleaseInfo({
  deviceType,
  currentFirmwareVersion,
  willUpdateFirmwareVersion,
}: {
  deviceType: IDeviceType;
  currentFirmwareVersion: string;
  willUpdateFirmwareVersion?: string;
}) {
  try {
    const { data } = await axios.request({
      url: 'http://localhost:21320',
      method: 'POST',
      withCredentials: false,
      timeout: 3000,
    });
    const { version = '0.0.0' } = data;
    const isOldVersionBridge = semver.lt(version, REQUIRED_BRIDGE_VERSION);

    let shouldUpdate = false;
    if (DeviceModelToTypes.model_touch.includes(deviceType)) {
      if (
        willUpdateFirmwareVersion &&
        semver.gte(willUpdateFirmwareVersion, TOUCH_NEED_UPDATE_BRIDGE_VERSION) &&
        isOldVersionBridge
      ) {
        shouldUpdate = true;
      }
      if (
        semver.gte(currentFirmwareVersion, TOUCH_NEED_UPDATE_BRIDGE_VERSION) &&
        isOldVersionBridge
      ) {
        shouldUpdate = true;
      }
    }

    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
      if (
        willUpdateFirmwareVersion &&
        semver.gte(willUpdateFirmwareVersion, CLASSIC_MINI_NEED_UPDATE_BRIDGE_VERSION) &&
        isOldVersionBridge
      ) {
        shouldUpdate = true;
      }
      if (
        semver.gte(currentFirmwareVersion, CLASSIC_MINI_NEED_UPDATE_BRIDGE_VERSION) &&
        isOldVersionBridge
      ) {
        shouldUpdate = true;
      }
    }

    const changelog = DataManager.getBridgeChangelog();

    return {
      shouldUpdate,
      status: shouldUpdate ? 'outdated' : 'valid',
      releaseVersion: REQUIRED_BRIDGE_VERSION,
      changelog,
    };
  } catch (e) {
    if (e.code === 'ECONNABORTED') {
      throw ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError);
    }
    throw ERRORS.TypedError(HardwareErrorCode.BridgeNotInstalled);
  }
}
