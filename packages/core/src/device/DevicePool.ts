import EventEmitter from 'events';
import { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
// eslint-disable-next-line import/no-cycle
import { Device, InitOptions } from './Device';
import { DEVICE } from '../events';
import type DeviceConnector from './DeviceConnector';
import { getDeviceUUID, getLogger, LoggerNames } from '../utils';

const Log = getLogger(LoggerNames.DevicePool);

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
      return currentDescriptor.session !== d.session;
    }
    return false;
  });
  const acquired = changedSessions.filter(d => typeof d.session === 'string');
  const released = changedSessions.filter(d => typeof d.session !== 'string');

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

export class DevicePool extends EventEmitter {
  static current: DeviceDescriptor[] | null = null;

  static upcoming: DeviceDescriptor[] = [];

  static connectedPool: DeviceDescriptor[] = [];

  static disconnectPool: DeviceDescriptor[] = [];

  static devicesCache: Record<string, Device> = {};

  static emitter = new EventEmitter();

  static connector: DeviceConnector;

  static setConnector(connector: DeviceConnector) {
    this.connector = connector;
  }

  static async getDevices(
    descriptorList: DeviceDescriptor[],
    connectId?: string,
    initOptions?: InitOptions
  ) {
    // Log.debug('get device list: connectId: ', connectId);

    const devices: Record<string, Device> = {};
    const deviceList = [];

    // If there is a connectId
    // it means that you only want to get data from cache
    if (connectId) {
      const device = this.devicesCache[connectId];
      if (device) {
        const exist = descriptorList.find(d => d.path === device.originalDescriptor.path);
        if (exist) {
          // Log.debug('find existed Device: ', connectId);
          device.updateDescriptor(exist, true);
          devices[connectId] = device;
          deviceList.push(device);
          await this._checkDevicePool(initOptions);
          return { devices, deviceList };
        }
        Log.debug('found device in cache, but path is different: ', connectId);
      }
    }

    for await (const descriptor of descriptorList) {
      const device = await this._createDevice(descriptor, initOptions);

      if (device.features) {
        const uuid = getDeviceUUID(device.features);
        if (this.devicesCache[uuid]) {
          const cache = this.devicesCache[uuid];
          cache.updateDescriptor(descriptor, true);
        }
        this.devicesCache[uuid] = device;
        devices[uuid] = device;
      }

      deviceList.push(device);
    }
    // Log.debug('get devices result : ', devices, deviceList);
    // console.log('device poll -> connected: ', this.connectedPool);
    // console.log('device poll -> disconnected: ', this.disconnectPool);
    await this._checkDevicePool(initOptions);
    return { devices, deviceList };
  }

  static clearDeviceCache(connectId?: string) {
    // Log.debug('clear device pool cache: connectId', connectId);
    // Log.debug('clear device pool cache: ', this.devicesCache);
    if (connectId) {
      delete this.devicesCache[connectId];
    }
  }

  static async _createDevice(descriptor: DeviceDescriptor, initOptions?: InitOptions) {
    let device = this.getDeviceByPath(descriptor.path);
    if (!device) {
      device = Device.fromDescriptor(descriptor);
      device.deviceConnector = this.connector;
      await device.connect();
      await device.initialize(initOptions);
      await device.release();
    }
    return device;
  }

  static async _checkDevicePool(initOptions?: InitOptions) {
    await this._sendConnectMessage(initOptions);
    this._sendDisconnectMessage();
  }

  static async _sendConnectMessage(initOptions?: InitOptions) {
    for (let i = this.connectedPool.length - 1; i >= 0; i--) {
      const descriptor = this.connectedPool[i];
      const device = await this._createDevice(descriptor, initOptions);
      Log.debug('emit DEVICE.CONNECT: ', device?.features);
      this.emitter.emit(DEVICE.CONNECT, device);
      this.connectedPool.splice(i, 1);
    }
  }

  static _sendDisconnectMessage() {
    for (let i = this.disconnectPool.length - 1; i >= 0; i--) {
      const descriptor = this.connectedPool[i];
      const device = descriptor?.path ? this.getDeviceByPath(descriptor.path) : null;
      if (device) {
        this.emitter.emit(DEVICE.DISCONNECT, device);
      }
      this.disconnectPool.splice(i, 1);
    }
  }

  static reportDeviceChange(upcoming: DeviceDescriptor[]) {
    const diff = getDiff(this.current || [], upcoming);

    this.upcoming = upcoming;
    this.current = this.upcoming;

    Log.debug('device pool -> current: ', this.current);
    Log.debug('device pool -> upcomming: ', this.upcoming);
    Log.debug('DeviceCache.reportDeviceChange diff: ', diff);

    if (!diff.didUpdate) {
      return;
    }

    diff.connected.forEach(d => {
      const device = this.getDeviceByPath(d.path);
      if (!device) {
        this._addConnectedDeviceToPool(d);
        return;
      }
      Log.debug('emit DEVICE.CONNECT: ', device.features);
      this.emitter.emit(DEVICE.CONNECT, device);
    });

    diff.disconnected.forEach(d => {
      this._removeDeviceFromConnectedPool(d.path);
      const device = this.getDeviceByPath(d.path);
      if (!device) {
        this._addDisconnectedDeviceToPool(d);
        return;
      }

      Log.debug('emit DEVICE.DISCONNECT: ', device.features);
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
