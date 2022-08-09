import { Transport, OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import { safeThrowError } from '../constants';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';
import { DeviceCache, DeviceDescriptorDiff } from './DeviceCache';
import { resolveAfter } from '../utils/promiseUtils';
import { getLogger, LoggerNames } from '../utils';

const Log = getLogger(LoggerNames.DeviceConnector);

export default class DeviceConnector {
  transport: Transport;

  listenTimestamp = 0;

  current: DeviceDescriptor[] | null = null;

  upcoming: DeviceDescriptor[] = [];

  listening = false;

  constructor() {
    TransportManager.load();
    this.transport = TransportManager.getTransport();
  }

  async enumerate() {
    try {
      const descriptors = await this.transport.enumerate();
      this.upcoming = descriptors;
      this._reportDevicesChange();
      return { descriptors } as DeviceDescriptorDiff;
    } catch (error) {
      safeThrowError(error);
    }
  }

  async listen() {
    const waitForEvent = this.current !== null;
    const current: DeviceDescriptor[] = this.current || [];

    this.listening = true;

    let descriptors: DeviceDescriptor[];

    try {
      Log.debug('Start listening', current);
      this.listenTimestamp = new Date().getTime();
      descriptors = waitForEvent
        ? await this.transport.listen(current)
        : await this.transport.enumerate();
      if (!this.listening) return; // do not continue if stop() was called

      this.upcoming = descriptors;
      Log.debug('Listen result', descriptors);
      this._reportDevicesChange();
      if (this.listening) this.listen(); // handlers might have called stop()
    } catch (error) {
      const time = new Date().getTime() - this.listenTimestamp;
      Log.debug('Listen error', 'timestamp', time, typeof error);

      if (time > 1100) {
        await resolveAfter(1000, null);
        if (this.listening) this.listen();
      } else {
        Log.warn('Transport error');
      }
    }
  }

  stop() {
    this.listening = false;
  }

  async acquire(path: string, session?: string | null) {
    Log.debug('acquire', path, session);
    const env = DataManager.getSettings('env');
    try {
      let res;
      if (env === 'react-native') {
        res = await this.transport.acquire({ uuid: path });
      } else {
        res = await this.transport.acquire({ path, previous: session ?? null });
      }
      return res;
    } catch (error) {
      safeThrowError(error);
    }
  }

  async release(session: string, onclose: boolean) {
    try {
      const res = await this.transport.release(session, onclose);
      return res;
    } catch (error) {
      safeThrowError(error);
    }
  }

  _reportDevicesChange() {
    DeviceCache.reportDeviceChange(this.upcoming);
  }
}
