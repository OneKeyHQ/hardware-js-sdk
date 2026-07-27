import { BaseMethod } from '../BaseMethod';

export default class DeviceSupportFeatures extends BaseMethod {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  run() {
    const inputPinOnSoftware = this.device.supportInputPinOnSoftware();
    const modifyHomescreen = this.device.supportModifyHomescreen();
    return Promise.resolve({
      inputPinOnSoftware,
      modifyHomescreen,
      device: this.device.toMessageObject(),
    });
  }
}
