import { getFirmwareStatus } from '../data-manager/FirmwareInfo';
import { BaseMethod } from './BaseMethod';

export default class CheckFirmwareRelease extends BaseMethod {
  init() {}

  run() {
    const firmwareStatus = getFirmwareStatus(this.device.features);
    return Promise.resolve(firmwareStatus);
  }
}
