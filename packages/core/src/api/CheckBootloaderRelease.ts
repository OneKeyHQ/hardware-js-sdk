import { BaseMethod } from './BaseMethod';

import { UI_REQUEST } from '../constants/ui-request';
import {
  checkNeedUpdateBootForClassicAndMini,
  checkNeedUpdateBootForTouch,
} from './firmware/updateBootloader';
import { DataManager } from '../data-manager';
import { getDeviceType } from '../utils';
import { DeviceModelToTypes } from '../types';

export default class CheckBootloaderRelease extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (!this.device.features) {
      return null;
    }
    const { features } = this.device;
    const deviceType = getDeviceType(features);
    let shouldUpdate = false;
    // classic mini classic1s
    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
      shouldUpdate = !!checkNeedUpdateBootForClassicAndMini(
        features,
        this.payload.willUpdateFirmwareVersion
      );
    } else if (deviceType === 'touch') {
      shouldUpdate = checkNeedUpdateBootForTouch(features);
    }
    const resource = DataManager.getBootloaderResource(features);
    return Promise.resolve({
      shouldUpdate,
      status: shouldUpdate ? 'outdated' : 'valid',
      release: resource,
      bootloaderMode: !!features.bootloader_mode,
    });
  }
}
