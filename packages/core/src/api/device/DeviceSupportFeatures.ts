import { BaseMethod } from '../BaseMethod';

export default class DeviceSupportFeatures extends BaseMethod {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

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
