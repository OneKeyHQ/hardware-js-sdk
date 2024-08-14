import axios from 'axios';
import semver from 'semver';
import { Features } from '@onekeyfe/hd-transport';
import { getDeviceType } from './deviceInfoUtils';
import { getDeviceFirmwareVersion } from './deviceVersionUtils';
import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';

const BridgeVersion = '2.2.0';
const TouchNeedUpdateVersion = '4.3.0';
const ClassicAndMiniNeedUpdateVersion = '3.1.0';

export async function getBridgeReleaseInfo(features: Features, willUpdateFirmwareVersion: string) {
  const { data } = await axios.request({
    url: 'http://localhost:21320',
    method: 'POST',
    withCredentials: false,
    timeout: 3000,
  });
  const { version = '0.0.0' } = data;

  const deviceType = getDeviceType(features);
  const currentFirmwareVersion = getDeviceFirmwareVersion(features).join('.');
  const isOldVersionBridge = semver.lt(version, BridgeVersion);

  let shouldUpdate = false;
  if (DeviceModelToTypes.model_touch.includes(deviceType)) {
    if (semver.gte(willUpdateFirmwareVersion, TouchNeedUpdateVersion) && isOldVersionBridge) {
      shouldUpdate = true;
    }
    if (semver.gte(currentFirmwareVersion, TouchNeedUpdateVersion) && isOldVersionBridge) {
      shouldUpdate = true;
    }
  }
  // classic mini classic1s
  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    if (
      semver.gte(willUpdateFirmwareVersion, ClassicAndMiniNeedUpdateVersion) &&
      isOldVersionBridge
    ) {
      shouldUpdate = true;
    }
    if (semver.gte(currentFirmwareVersion, ClassicAndMiniNeedUpdateVersion) && isOldVersionBridge) {
      shouldUpdate = true;
    }
  }

  const changelog = DataManager.getBridgeChangelog();

  return {
    shouldUpdate,
    status: shouldUpdate ? 'outdated' : 'valid',
    releaseVersion: BridgeVersion,
    changelog,
  };
}
