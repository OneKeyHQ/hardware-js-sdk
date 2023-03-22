import { BaseMethod } from './BaseMethod';
import { getLog } from '../utils';

export default class CheckBridgeStatus extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const logs = getLog();
    return Promise.resolve(logs);
  }
}
