import { Transport, OneKeyDeviceInfoWithSession as DeviceDescriptor } from '@onekeyfe/hd-transport';
import TransportManager from '../data-manager/TransportManager';

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

const getDiff = (
  current: DeviceDescriptor[],
  descriptors: DeviceDescriptor[]
): DeviceDescriptorDiff => {
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

  current: DeviceDescriptor[] | null = null;

  upcoming: DeviceDescriptor[] = [];

  listening = false;

  constructor() {
    this.transport = TransportManager.getTransport();
  }

  async enumerate() {
    try {
      this.upcoming = await this.transport.enumerate();
      const diff = this._reportDevicesChange();
      return diff;
    } catch (error) {
      throw new Error(error);
      // empty
    }
  }

  async listen() {
    if (this.listening) {
      return;
    }
    this.listening = true;

    if (!this.current || !Array.isArray(this.current)) {
      return {};
    }

    try {
      this.upcoming = await this.transport.listen(this.current);
      const diff = this._reportDevicesChange();
      return diff;
    } catch (error) {
      throw new Error(error);
    } finally {
      this.listening = false;
    }
  }

  async acquire(path: string, session?: string | null) {
    try {
      const res = await this.transport.acquire({ path, previous: session });
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
