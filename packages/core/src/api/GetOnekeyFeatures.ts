import semver from 'semver';
import { UI_REQUEST } from '../constants/ui-request';
import { fixVersion } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

export default class GetOnekeyFeatures extends BaseMethod {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { message } = await this.device.commands.typedCall('OnekeyGetFeatures', 'OnekeyFeatures');
    if (!!message.onekey_firmware_version && !semver.valid(message.onekey_firmware_version)) {
      message.onekey_firmware_version = fixVersion(message.onekey_firmware_version);
    }
    return Promise.resolve(message);
  }
}
