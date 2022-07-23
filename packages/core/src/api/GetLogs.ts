import { BaseMethod } from './BaseMethod';
import { getLog } from '../utils';

export default class CheckBridgeStatus extends BaseMethod {
  init() {
    this.useDevice = false;
  }

  async run() {
    const logs = getLog();
    return Promise.resolve(logs);
  }
}
