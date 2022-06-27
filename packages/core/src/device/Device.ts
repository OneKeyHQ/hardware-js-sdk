import EventEmitter from 'events';
import { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';

import DeviceConnector from './DeviceConnector';
import { DeviceCommands } from './DeviceCommands';

import { initLog, Deferred, create as createDeferred } from '../utils';
import {
  getDeviceFirmwareVersion,
  getDeviceLabel,
  getDeviceType,
  getDeviceUUID,
  getDeviceBLEFirmwareVersion,
} from '../utils/deviceFeaturesUtils';
import type { Features, Device as DeviceTyped, UnavailableCapabilities } from '../types';
import { DEVICE, DeviceButtonRequestPayload } from '../events';
import { UI_REQUEST } from '../constants/ui-request';
import { ERRORS, PROTO } from '../constants';
import { DataManager } from '../data-manager';

type RunOptions = {
  keepSession?: boolean;
};

const parseRunOptions = (options?: RunOptions): RunOptions => {
  if (!options) options = {};
  return options;
};

const Log = initLog('Device');

export interface DeviceEvents {
  [DEVICE.PIN]: [Device, PROTO.PinMatrixRequestType | undefined, (err: any, pin: string) => void];
  [DEVICE.PASSPHRASE_ON_DEVICE]: [Device, ((response: any) => void)?];
  [DEVICE.BUTTON]: [Device, DeviceButtonRequestPayload];
}

export interface Device {
  on<K extends keyof DeviceEvents>(type: K, listener: (...event: DeviceEvents[K]) => void): this;
  off<K extends keyof DeviceEvents>(type: K, listener: (...event: DeviceEvents[K]) => void): this;
  emit<K extends keyof DeviceEvents>(type: K, ...args: DeviceEvents[K]): boolean;
}

export class Device extends EventEmitter {
  /**
   * 设备标识对象
   */
  originalDescriptor: DeviceDescriptor;

  /**
   * 设备主 ID
   * 蓝牙连接时是设备的 UUID
   * USB连接时是设备的 sessionID
   */
  mainId?: string | null;

  /**
   * 通信管道，向设备发送请求
   */
  deviceConnector?: DeviceConnector | null = null;

  /**
   * 固件命令
   */
  // @ts-expect-error: strictPropertyInitialization
  commands: DeviceCommands;

  /**
   * 设备信息
   */
  features: Features | undefined = undefined;

  /**
   * 是否需要更新设备信息
   */
  featuresNeedsReload = false;

  runPromise?: Deferred<void> | null;

  externalState: string[] = [];

  unavailableCapabilities: UnavailableCapabilities = {};

  instance = 0;

  internalState: string[] = [];

  needReloadDevice = false;

  /**
   * 执行 API 方法后是否保留 SessionID
   */
  keepSession = false;

  constructor(descriptor: DeviceDescriptor) {
    super();
    this.originalDescriptor = descriptor;
  }

  static fromDescriptor(originalDescriptor: DeviceDescriptor) {
    const descriptor = { ...originalDescriptor };
    return new Device(descriptor);
  }

  // simplified object to pass via postMessage
  toMessageObject(): DeviceTyped | null {
    if (this.isUnacquired() || !this.features) return null;

    const env = DataManager.getSettings('env');

    return {
      /** Android uses Mac address, iOS uses uuid, USB uses uuid  */
      connectId: env === 'react-native' ? this.mainId || null : getDeviceUUID(this.features),
      /** Hardware ID, will not change at any time */
      uuid: getDeviceUUID(this.features),
      deviceType: getDeviceType(this.features),
      /** ID for current seeds, will clear after replace a new seed at device */
      deviceId: this.features.device_id || null,
      path: this.originalDescriptor.path,
      name:
        this.features.ble_name ||
        this.features.label ||
        `OneKey ${getDeviceType(this.features).toUpperCase()}`,
      label: getDeviceLabel(this.features),
      mode: this.getMode(),
      features: this.features,
      firmwareVersion: this.getFirmwareVersion(),
      bleFirmwareVersion: this.getBLEFirmwareVersion(),
      unavailableCapabilities: this.unavailableCapabilities,
    };
  }

  /**
   * Device connect
   * @returns {Promise<boolean>}
   */
  connect() {
    const env = DataManager.getSettings('env');
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<boolean>(async resolve => {
      if (env === 'react-native') {
        try {
          await this.acquire();
          resolve(true);
        } catch (error) {
          resolve(error);
        }
        return;
      }
      // 不存在 Session ID 或存在 Session ID 但设备在别处使用，都需要 acquire 获取最新 sessionID
      if (!this.mainId || (!this.isUsedHere() && this.originalDescriptor)) {
        try {
          await this.acquire();
          resolve(true);
        } catch (error) {
          resolve(error);
        }
        return;
      }
      if (this.isUsedHere()) {
        resolve(true);
        return;
      }
      resolve(false);
    });
  }

  async acquire() {
    const env = DataManager.getSettings('env');
    const mainIdKey = env === 'react-native' ? 'id' : 'session';
    try {
      if (env === 'react-native') {
        const res = await this.deviceConnector?.acquire(this.originalDescriptor.id);
        this.mainId = (res as unknown as any).uuid ?? '';
        Log.debug('Expected uuid:', this.mainId);
      } else {
        this.mainId = await this.deviceConnector?.acquire(
          this.originalDescriptor.path,
          this.originalDescriptor.session
        );
        Log.debug('Expected session id:', this.mainId);
      }
      this.updateDescriptor({ [mainIdKey]: this.mainId } as unknown as DeviceDescriptor);
      if (this.commands) {
        this.commands.dispose();
      }

      this.commands = new DeviceCommands(this, this.mainId ?? '');
    } catch (error) {
      if (this.runPromise) {
        this.runPromise.reject(error);
      } else {
        throw error;
      }
      this.runPromise = null;
    }
  }

  async release() {
    const env = DataManager.getSettings('env');
    if (
      (this.isUsedHere() && !this.keepSession && this.mainId) ||
      (this.mainId && env === 'react-native')
    ) {
      if (this.commands) {
        this.commands.dispose();
        if (this.commands.callPromise) {
          try {
            await this.commands.callPromise;
          } catch (error) {
            this.commands.callPromise = undefined;
          }
        }
      }
      try {
        await this.deviceConnector?.release(this.mainId, false);
        this.updateDescriptor({ session: null } as DeviceDescriptor);
      } catch (err) {
        Log.error('[Device] release error: ', err);
      } finally {
        this.needReloadDevice = true;
      }
    }
  }

  getCommands() {
    return this.commands;
  }

  getInternalState() {
    return this.internalState[this.instance];
  }

  async initialize() {
    let payload: any;
    if (this.features) {
      const internalState = this.getInternalState();
      payload = {};
      if (internalState) {
        payload.session_id = internalState;
      }
    }

    const { message } = await this.commands.typedCall('Initialize', 'Features', payload);
    this._updateFeatures(message);
  }

  async getFeatures() {
    const { message } = await this.commands.typedCall('GetFeatures', 'Features', {});
    this._updateFeatures(message);
  }

  _updateFeatures(feat: Features) {
    // GetFeatures doesn't return 'session_id'
    if (this.features && this.features.session_id && !feat.session_id) {
      feat.session_id = this.features.session_id;
    }
    feat.unlocked = feat.unlocked || true;

    this.features = feat;
    this.featuresNeedsReload = false;
  }

  /**
   * 暂时只在 acquire 后更新 Session ID
   * 后续看是否有需要依据 listen 返回结果更新
   * @param descriptor
   */
  updateDescriptor(descriptor: DeviceDescriptor) {
    const env = DataManager.getSettings('env');
    if (env === 'react-native') {
      return;
    }
    const originalSession = this.originalDescriptor.session;
    const upcomingSession = descriptor.session;

    if (originalSession !== upcomingSession) {
      this.originalDescriptor.session = upcomingSession;
    }
  }

  updateFromCache(device: Device) {
    this.mainId = device.mainId;
    this.commands = device.commands;
    this.updateDescriptor(device.originalDescriptor);
    if (device.features) {
      this._updateFeatures(device.features);
    }
  }

  async run(fn?: () => Promise<void>, options?: RunOptions) {
    if (this.runPromise) {
      this.interruption();
      Log.debug('[Device] run error:', 'Device is running, but will cancel previous operate');
    }

    options = parseRunOptions(options);

    this.runPromise = createDeferred(this._runInner.bind(this, fn, options));
    return this.runPromise.promise;
  }

  async _runInner<T>(fn: (() => Promise<T>) | undefined, options: RunOptions) {
    if (!this.isUsedHere() || this.commands.disposed) {
      await this.acquire();
      try {
        if (fn) {
          await this.initialize();
        }
      } catch (error) {
        this.runPromise = null;
        return Promise.reject(
          ERRORS.TypedError(
            'Device_InitializeFailed',
            `Initialize failed: ${error.message as string}, code: ${error.code as string}`
          )
        );
      }
    }

    if (options.keepSession) {
      this.keepSession = true;
    }

    if (fn) {
      await fn();
    }

    if (
      (!this.keepSession && typeof options.keepSession !== 'boolean') ||
      options.keepSession === false
    ) {
      this.keepSession = false;
      await this.release();
      Log.debug('release device, mainId: ', this.mainId);
    }

    if (this.runPromise) {
      this.runPromise.resolve();
    }

    this.runPromise = null;
  }

  interruption() {
    if (this.commands) {
      this.commands.dispose();
    }
    if (this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError('Device_Interrupted'));
    }
  }

  getMode() {
    if (this.features?.bootloader_mode) return 'bootloader';
    if (!this.features?.initialized) return 'initialize';
    if (this.features?.no_backup) return 'seedless';
    return 'normal';
  }

  getFirmwareVersion() {
    if (!this.features) return null;
    return getDeviceFirmwareVersion(this.features);
  }

  getBLEFirmwareVersion() {
    if (!this.features) return null;
    return getDeviceBLEFirmwareVersion(this.features);
  }

  isUsed() {
    return typeof this.originalDescriptor.session === 'string';
  }

  isUsedHere() {
    const env = DataManager.getSettings('env');
    if (env === 'react-native') {
      return false;
    }
    return this.isUsed() && this.originalDescriptor.session === this.mainId;
  }

  isUsedElsewhere(): boolean {
    return this.isUsed() && !this.isUsedHere();
  }

  isBootloader() {
    return this.features && !!this.features.bootloader_mode;
  }

  isInitialized() {
    return this.features && !!this.features.initialized;
  }

  isSeedless() {
    return this.features && !!this.features.no_backup;
  }

  isUnacquired(): boolean {
    return this.features === undefined;
  }

  hasUnexpectedMode(allow: string[], require: string[]) {
    // both allow and require cases might generate single unexpected mode
    if (this.features) {
      // allow cases
      if (this.isBootloader() && !allow.includes(UI_REQUEST.BOOTLOADER)) {
        return UI_REQUEST.BOOTLOADER;
      }
      if (!this.isInitialized() && !allow.includes(UI_REQUEST.INITIALIZE)) {
        return UI_REQUEST.INITIALIZE;
      }
      if (this.isSeedless() && !allow.includes(UI_REQUEST.SEEDLESS)) {
        return UI_REQUEST.SEEDLESS;
      }

      // require cases
      if (!this.isBootloader() && require.includes(UI_REQUEST.BOOTLOADER)) {
        return UI_REQUEST.NOT_IN_BOOTLOADER;
      }
    }
    return null;
  }
}

export default Device;
