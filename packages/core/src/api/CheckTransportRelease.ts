import semver from 'semver';
import TransportManager from '../data-manager/TransportManager';
import { getBridgeInfo } from '../data-manager/transportInfo';
import { BaseMethod } from './BaseMethod';

export default class CheckTransportRelease extends BaseMethod {
  init() {
    this.useDevice = false;
  }

  async run() {
    const transport = TransportManager.getTransport();
    const localVersion = await transport.init();
    const latestVersion = getBridgeInfo().version.join('.');
    const isLatest = semver.gte(localVersion, latestVersion);
    const response = isLatest ? 'valid' : 'outdated';
    return Promise.resolve(response);
  }
}
