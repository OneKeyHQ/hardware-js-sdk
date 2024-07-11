import { BaseMethod } from './BaseMethod';
import { getLog } from '../utils';

export default class GetLogs extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  serializeLog({
    level,
    prefix,
    message,
    timestamp,
  }: {
    level: string;
    prefix: string;
    message: any[];
    timestamp: number;
  }) {
    const date = new Date(timestamp).toISOString();

    const messageString = message
      .map(item => {
        if (typeof item === 'object') {
          return JSON.stringify(item);
        }
        return String(item);
      })
      .join(' ');

    return `[${date}] ${level.toUpperCase()} ${prefix}: ${messageString}`;
  }

  async run() {
    const logs = getLog().map(log => this.serializeLog(log));
    return Promise.resolve(logs);
  }
}
