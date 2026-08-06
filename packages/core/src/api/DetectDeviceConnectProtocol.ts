import { BaseMethod } from './BaseMethod';

export default class DetectDeviceConnectProtocol extends BaseMethod {
  init() {
    this.payload.forceProtocolDetection = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.unlockPolicy = 'none';
  }

  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  run() {
    return Promise.resolve(this.device.getProtocol());
  }
}
