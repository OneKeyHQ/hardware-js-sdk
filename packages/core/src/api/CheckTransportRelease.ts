import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';

import { BaseMethod } from './BaseMethod';

export default class CheckTransportRelease extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const transport = TransportManager.getTransport();
    const localVersion = await transport.init();

    const response = DataManager.getTransportStatus(localVersion);

    return Promise.resolve(response);
  }
}
