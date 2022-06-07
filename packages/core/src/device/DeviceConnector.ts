import { Transport, OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';
import { initLog } from '../utils';
import { resolveAfter } from '../utils/promiseUtils';

export type DeviceDescriptorDiff = {
  didUpdate: boolean;
  connected: DeviceDescriptor[];
  disconnected: DeviceDescriptor[];
  changedSessions: DeviceDescriptor[];
  changedDebugSessions: DeviceDescriptor[];
  acquired: DeviceDescriptor[];
  debugAcquired: DeviceDescriptor[];
  released: DeviceDescriptor[];
  debugReleased: DeviceDescriptor[];
  descriptors: DeviceDescriptor[];
};

const Log = initLog('DeviceConnector');

const getDiff = (
  current: DeviceDescriptor[],
  descriptors: DeviceDescriptor[]
): DeviceDescriptorDiff => {
  const env = DataManager.getSettings('env');
  if (env === 'react-native') {
    return {
      descriptors,
    } as DeviceDescriptorDiff;
  }

  const connected = descriptors.filter(d => current.find(x => x.path === d.path) === undefined);
  const disconnected = current.filter(d => descriptors.find(x => x.path === d.path) === undefined);
  const changedSessions = descriptors.filter(d => {
    const currentDescriptor = current.find(x => x.path === d.path);
    if (currentDescriptor) {
      // return currentDescriptor.debug ? (currentDescriptor.debugSession !== d.debugSession) : (currentDescriptor.session !== d.session);
      return currentDescriptor.session !== d.session;
    }
    return false;
  });
  const acquired = changedSessions.filter(d => typeof d.session === 'string');
  const released = changedSessions.filter(
    d =>
      // const session = descriptor.debug ? descriptor.debugSession : descriptor.session;
      typeof d.session !== 'string'
  );

  const changedDebugSessions = descriptors.filter(d => {
    const currentDescriptor = current.find(x => x.path === d.path);
    if (currentDescriptor) {
      return currentDescriptor.debugSession !== d.debugSession;
    }
    return false;
  });
  const debugAcquired = changedSessions.filter(d => typeof d.debugSession === 'string');
  const debugReleased = changedSessions.filter(d => typeof d.debugSession !== 'string');

  const didUpdate =
    connected.length + disconnected.length + changedSessions.length + changedDebugSessions.length >
    0;

  return {
    connected,
    disconnected,
    changedSessions,
    acquired,
    released,
    changedDebugSessions,
    debugAcquired,
    debugReleased,
    didUpdate,
    descriptors,
  };
};

export default class DeviceConnector {
  transport: Transport;

  listenTimestamp = 0;

  current: DeviceDescriptor[] | null = null;

  upcoming: DeviceDescriptor[] = [];

  listening = false;

  constructor() {
    if (!TransportManager.getTransport()) {
      TransportManager.load();
    }
    this.transport = TransportManager.getTransport();
  }

  async enumerate() {
    try {
      this.upcoming = await this.transport.enumerate();
      const diff = this._reportDevicesChange();
      Log.debug('diff result: ', diff);
      return diff;
    } catch (error) {
      throw new Error(error);
      // empty
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
    console.log('acquire', path, session);
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
      throw new Error(error);
    }
  }

  async release(session: string, onclose: boolean) {
    try {
      const res = await this.transport.release(session, onclose);
      return res;
    } catch (error) {
      throw new Error(error);
    }
  }

  _reportDevicesChange() {
    const diff = getDiff(this.current || [], this.upcoming);
    this.current = this.upcoming;
    return diff;
  }
}
