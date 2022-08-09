import EventEmitter from 'events';
import { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import { Device } from './Device';
import { DEVICE } from '../events';

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

export class DeviceCache extends EventEmitter {
  static current: DeviceDescriptor[] | null = null;

  static upcoming: DeviceDescriptor[] = [];

  static connectedPool: DeviceDescriptor[] = [];

  static disconnectPool: DeviceDescriptor[] = [];

  static devicesCache: Record<string, Device> = {};

  static emitter = new EventEmitter();

  static reportDeviceChange(upcoming: DeviceDescriptor[]) {
    const diff = getDiff(this.current || [], upcoming);

    this.current = this.upcoming;

    console.log('DeviceCache.reportDeviceChange diff: ', diff);

    if (!diff.didUpdate) {
      return;
    }

    diff.connected.forEach(d => {
      const device = this.getDeviceByPath(d.path);
      if (!device) {
        this._addConnectedDeviceToPool(d);
        return;
      }
      this.emitter.emit(DEVICE.CONNECT, device);
    });

    diff.disconnected.forEach(d => {
      this._removeDeviceFromConnectedPool(d.path);
      const device = this.getDeviceByPath(d.path);
      if (!device) {
        this._removeDeviceFromConnectedPool(d.path);
        return;
      }

      this.emitter.emit(DEVICE.DISCONNECT, device);
    });
  }

  static getDeviceByPath(path: string) {
    return Object.values(this.devicesCache).find(d => d.originalDescriptor.path === path);
  }

  static _addConnectedDeviceToPool(descriptor: DeviceDescriptor) {
    const existDescriptorIndex = this.connectedPool.findIndex(d => d.path === descriptor.path);
    if (existDescriptorIndex > -1) {
      this.connectedPool.splice(existDescriptorIndex, 1, descriptor);
      return;
    }

    this.connectedPool.push(descriptor);
  }

  static _removeDeviceFromConnectedPool(path: string) {
    const index = this.connectedPool.findIndex(d => d.path === path);
    if (index > -1) {
      this.connectedPool.splice(index, 1);
    }
  }

  static _addDisconnectedDeviceToPool(descriptor: DeviceDescriptor) {
    const existDescriptorIndex = this.disconnectPool.findIndex(d => d.path === descriptor.path);
    if (existDescriptorIndex > -1) {
      this.disconnectPool.splice(existDescriptorIndex, 1, descriptor);
      return;
    }

    this.disconnectPool.push(descriptor);
  }
}
