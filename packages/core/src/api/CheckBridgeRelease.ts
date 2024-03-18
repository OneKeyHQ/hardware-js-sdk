import axios from 'axios';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getDeviceType, getDeviceFirmwareVersion } from '../utils';
import { DeviceModelToTypes } from '../types';

const BridgeVersion = '2.2.0';
const TouchNeedUpdateVersion = '4.3.0';
const ClassicAndMiniNeedUpdateVersion = '3.1.0';

export default class CheckBridgeRelease extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (!this.device.features) {
      return null;
    }
    try {
      const { data } = await axios.request({
        url: 'http://localhost:21320',
        method: 'POST',
        withCredentials: false,
        timeout: 3000,
      });
      const { version = '0.0.0' } = data;

      const { willUpdateFirmwareVersion } = this.payload;
      const { features } = this.device;
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
        if (
          semver.gte(currentFirmwareVersion, ClassicAndMiniNeedUpdateVersion) &&
          isOldVersionBridge
        ) {
          shouldUpdate = true;
        }
      }

      return {
        shouldUpdate,
        status: shouldUpdate ? 'outdated' : 'valid',
        releaseVersion: BridgeVersion,
      };
    } catch (e) {
      if (e.code === 'ECONNABORTED') {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError));
      }
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.BridgeNotInstalled));
    }
  }
}
