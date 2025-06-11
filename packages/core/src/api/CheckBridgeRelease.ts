import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getDeviceType, getDeviceFirmwareVersion } from '../utils';
import { getBridgeReleaseInfo } from '../utils/bridgeUpdate';

export default class CheckBridgeRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (!this.device.features) {
      return null;
    }

    const { willUpdateFirmwareVersion } = this.payload;
    const { features } = this.device;
    const deviceType = getDeviceType(features);
    const currentFirmwareVersion = getDeviceFirmwareVersion(features).join('.');
    return getBridgeReleaseInfo({
      deviceType,
      currentFirmwareVersion,
      willUpdateFirmwareVersion,
    });
  }
}
