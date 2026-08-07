import semver from 'semver';

import { UI_REQUEST } from '../constants/ui-request';
import { fixVersion } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

import type { OnekeyFeatures } from '../types';

function normalizeOnekeyFirmwareVersion(message: OnekeyFeatures) {
  if (message.onekey_firmware_version && !semver.valid(message.onekey_firmware_version)) {
    message.onekey_firmware_version = fixVersion(message.onekey_firmware_version);
  }
}

export default class GetOnekeyFeatures extends BaseMethod {
  init() {
    this.unlockPolicy = 'none';
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
    normalizeOnekeyFirmwareVersion(message);
    return Promise.resolve(message);
  }
}
