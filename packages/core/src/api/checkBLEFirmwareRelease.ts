import { UI_REQUEST } from '../constants/ui-request';
import { getBLEFirmwareStatus } from '../data-manager/BLEFirmwareInfo';
import { BaseMethod } from './BaseMethod';

export default class CheckBLEFirmwareRelease extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  run() {
    const firmwareStatus = getBLEFirmwareStatus(this.device.features);
    return Promise.resolve(firmwareStatus);
  }
}
