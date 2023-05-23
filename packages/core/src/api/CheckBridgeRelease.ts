import axios from 'axios';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getDeviceType } from '../utils';

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

      const { features } = this.device;
      const deviceType = getDeviceType(features);
      let shouldUpdate = false;
      console.log('===?>>BRIDGE VERSION: ', version);
      if (deviceType === 'touch') {
        if (
          semver.gte(this.payload.willUpdateFirmwareVersion, '4.2.0') &&
          semver.lt(version, '2.2.0')
        ) {
          shouldUpdate = true;
        }
      }

      return {
        shouldUpdate,
        status: shouldUpdate ? 'outdated' : 'valid',
      };
    } catch (e) {
      if (e.code === 'ECONNABORTED') {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError));
      }
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.BridgeNotInstalled));
    }
  }
}
