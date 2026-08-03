import EventEmitter from 'events';

// eslint-disable-next-line import/no-cycle
import { Device } from './Device';
import { DEVICE } from '../events';
import { LoggerNames, getLogger } from '../utils';

import type { InitOptions } from './Device';
import type { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import type DeviceConnector from './DeviceConnector';

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
          await this._refreshRuntimeState(device, initOptions);
          devices[connectId] = device;
          deviceList.push(device);
          await this._checkDevicePool(initOptions, connectId);
          return { devices, deviceList };
        }
        Log.debug('found device in cache, but path is different: ', connectId);
      }
    }

    const matchedDescriptor = connectId
      ? descriptorList.find(descriptor => descriptor.path === connectId)
      : undefined;
    const descriptorsToInitialize = matchedDescriptor ? [matchedDescriptor] : descriptorList;

    for await (const descriptor of descriptorsToInitialize) {
      const device = await this._createDevice(descriptor, initOptions);

      const connectId = device.getConnectId();
      if (connectId) {
        if (this.devicesCache[connectId]) {
          const cache = this.devicesCache[connectId];
          cache.updateDescriptor(descriptor, true);
        }
        this.devicesCache[connectId] = device;
        devices[connectId] = device;
      }

      deviceList.push(device);
    }
    // Log.debug('get devices result : ', devices, deviceList);
    // console.log('device poll -> connected: ', this.connectedPool);
    // console.log('device poll -> disconnected: ', this.disconnectPool);
    await this._checkDevicePool(initOptions, matchedDescriptor ? connectId : undefined);
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
      await device.connect(initOptions?.connectProtocol, {
        forceProtocolDetection: initOptions?.forceProtocolDetection,
      });
      try {
        await device.initialize(initOptions);
        if (initOptions?.refreshRuntimeState && device.isProtocolV2()) {
          await this._refreshProtocolV2DiscoveryState(device);
        }
      } finally {
        await device.release();
      }
    }
    return device;
  }

  static async _refreshRuntimeState(device: Device, initOptions?: InitOptions) {
    if (!initOptions?.refreshRuntimeState || !device.isProtocolV2()) return;
    let refreshError: unknown;
    await device.run(
      async () => {
        try {
          await this._refreshProtocolV2DiscoveryState(device);
        } catch (error) {
          // Device.run releases after the callback; then propagate the actual read error.
          refreshError = error;
        }
      },
      {
        connectProtocol: initOptions.connectProtocol,
        forceProtocolDetection: initOptions.forceProtocolDetection,
      }
    );
    if (refreshError instanceof Error) throw refreshError;
    if (refreshError) throw new Error(String(refreshError));
  }

  /**
   * Device lists require live mode and name data. A status failure remains a connection
   * error; settings only supplies a label, so its failure retains the existing name.
   * Device.getDeviceState skips unsupported status/settings calls in loader mode.
   */
  static async _refreshProtocolV2DiscoveryState(device: Device) {
    await device.getDeviceState({ refreshSections: ['status'] });
    try {
      await device.getDeviceState({ refreshSections: ['settings'] });
    } catch (error) {
      Log.debug('Unable to refresh Protocol V2 device label during discovery', error);
    }
  }

  static async _checkDevicePool(initOptions?: InitOptions, connectId?: string) {
    await this._sendConnectMessage(initOptions, connectId);
    this._sendDisconnectMessage();
  }

  static async _sendConnectMessage(initOptions?: InitOptions, connectId?: string) {
    for (let i = this.connectedPool.length - 1; i >= 0; i--) {
      const descriptor = this.connectedPool[i];
      if (!connectId || descriptor.path === connectId) {
        const device = await this._createDevice(descriptor, initOptions);
        Log.debug('emit DEVICE.CONNECT: ', device?.features);
        this.emitter.emit(DEVICE.CONNECT, device);
        this.connectedPool.splice(i, 1);
      }
    }
  }

  static _sendDisconnectMessage() {
    for (let i = this.disconnectPool.length - 1; i >= 0; i--) {
      const descriptor = this.disconnectPool[i];
      const device = descriptor?.path ? this.getDeviceByPath(descriptor.path) : null;
      if (device) {
        device.markTransportDisconnected();
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
      device.markTransportDisconnected();
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

  static resetState() {
    this.current = null;
    this.upcoming = [];
    this.connectedPool = [];
    this.disconnectPool = [];
    this.devicesCache = {};

    Log.debug('DevicePool state has been reset');
  }

  static dispose() {
    this.resetState();
    this.emitter.removeAllListeners();
  }
}
