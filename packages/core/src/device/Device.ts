import EventEmitter from 'events';
import { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import {
  createDeferred,
  Deferred,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
} from '@onekeyfe/hd-shared';
import {
  getDeviceBLEFirmwareVersion,
  getDeviceBleName,
  getDeviceFirmwareVersion,
  getDeviceLabel,
  getDeviceType,
  getDeviceUUID,
  getLogger,
  LoggerNames,
} from '../utils';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';

import type DeviceConnector from './DeviceConnector';
// eslint-disable-next-line import/no-cycle
import { DeviceCommands, PassphrasePromptResponse } from './DeviceCommands';

import type { Device as DeviceTyped, Features, UnavailableCapabilities } from '../types';
import { DEVICE, DeviceButtonRequestPayload, DeviceFeaturesPayload } from '../events';
import { UI_REQUEST } from '../constants/ui-request';
import { PROTO } from '../constants';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';

export type InitOptions = {
  initSession?: boolean;
  deviceId?: string;
  passphraseState?: string;
  deriveCardano?: boolean;
};

export type RunOptions = {
  keepSession?: boolean;
} & InitOptions;

const parseRunOptions = (options?: RunOptions): RunOptions => {
  if (!options) options = {};
  return options;
};

const Log = getLogger(LoggerNames.Device);

export interface DeviceEvents {
  [DEVICE.PIN]: [Device, PROTO.PinMatrixRequestType | undefined, (err: any, pin: string) => void];
  [DEVICE.PASSPHRASE_ON_DEVICE]: [Device, ((response: any) => void)?];
  [DEVICE.BUTTON]: [Device, DeviceButtonRequestPayload];
  [DEVICE.FEATURES]: [Device, DeviceFeaturesPayload];
  [DEVICE.PASSPHRASE]: [Device, (response: PassphrasePromptResponse, error?: Error) => void];
}

export interface Device {
  on<K extends keyof DeviceEvents>(type: K, listener: (...event: DeviceEvents[K]) => void): this;

  off<K extends keyof DeviceEvents>(type: K, listener: (...event: DeviceEvents[K]) => void): this;

  emit<K extends keyof DeviceEvents>(type: K, ...args: DeviceEvents[K]): boolean;
}

const deviceSessionCache: Record<string, string> = {};

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

  passphraseState: string | undefined = undefined;

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
    const deviceType = getDeviceType(this.features);

    const bleName = getDeviceBleName(this.features);
    const label = getDeviceLabel(this.features);

    return {
      /** Android uses Mac address, iOS uses uuid, USB uses uuid  */
      connectId: DataManager.isBleConnect(env) ? this.mainId || null : getDeviceUUID(this.features),
      /** Hardware ID, will not change at any time */
      uuid: getDeviceUUID(this.features),
      deviceType,
      /** ID for current seeds, will clear after replace a new seed at device */
      deviceId: this.features.device_id || null,
      path: this.originalDescriptor.path,
      bleName,
      name: bleName || label || `OneKey ${deviceType?.toUpperCase()}`,
      label: label || 'OneKey',
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
      if (DataManager.isBleConnect(env)) {
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
    const mainIdKey = DataManager.isBleConnect(env) ? 'id' : 'session';
    try {
      if (DataManager.isBleConnect(env)) {
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
        await this.commands.dispose(false);
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
      (this.mainId && DataManager.isBleConnect(env))
    ) {
      if (this.commands) {
        this.commands.dispose(false);
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

  private generateStateKey(deviceId: string, passphraseState?: string) {
    if (passphraseState) {
      return `${deviceId}@${passphraseState}`;
    }
    return deviceId;
  }

  getInternalState(_deviceId?: string) {
    Log.debug(
      'getInternalState session param: ',
      `device_id: ${_deviceId}`,
      `features.device_id: ${this.features?.device_id}`,
      `passphraseState: ${this.passphraseState}`
    );
    Log.debug('getInternalState session cache: ', deviceSessionCache);

    const deviceId = _deviceId || this.features?.device_id;
    if (!deviceId) return undefined;
    if (!this.passphraseState) return undefined;

    const usePassKey = this.generateStateKey(deviceId, this.passphraseState);
    return deviceSessionCache[usePassKey];
  }

  tryFixInternalState(state: string, deviceId: string, sessionId: string | null = null) {
    Log.debug(
      'tryFixInternalState session param: ',
      `device_id: ${deviceId}`,
      `passphraseState: ${state}`,
      `sessionId: ${sessionId}`
    );

    const key = `${deviceId}`;
    const session = deviceSessionCache[key];
    if (session) {
      deviceSessionCache[this.generateStateKey(deviceId, state)] = session;
      delete deviceSessionCache[key];
    } else if (sessionId) {
      deviceSessionCache[this.generateStateKey(deviceId, state)] = sessionId;
    }
    Log.debug('tryFixInternalState session cache: ', deviceSessionCache);
  }

  private setInternalState(state: string, initSession?: boolean) {
    Log.debug(
      'setInternalState session param: ',
      `state: ${state}`,
      `initSession: ${initSession}`,
      `device_id: ${this.features?.device_id}`,
      `passphraseState: ${this.passphraseState}`
    );

    if (!this.features) return;
    if (!this.passphraseState && !initSession) return;

    const deviceId = this.features?.device_id;
    if (!deviceId) return;

    const key = this.generateStateKey(deviceId, this.passphraseState);

    if (state) {
      deviceSessionCache[key] = state;
    }
    Log.debug('setInternalState done session cache: ', deviceSessionCache);
  }

  clearInternalState(_deviceId?: string) {
    Log.debug('clearInternalState param: ', _deviceId);

    const deviceId = _deviceId || this.features?.device_id;
    if (!deviceId) return;
    const key = `${deviceId}`;
    delete deviceSessionCache[key];

    if (this.passphraseState) {
      const usePassKey = this.generateStateKey(deviceId, this.passphraseState);
      delete deviceSessionCache[usePassKey];
    }
  }

  async initialize(options?: InitOptions) {
    Log.debug('initialize param:', options);

    this.passphraseState = options?.passphraseState;

    if (options?.initSession) {
      this.clearInternalState(options?.deviceId);
    }

    const internalState = this.getInternalState(options?.deviceId);
    const payload: any = {};
    if (internalState) {
      payload.session_id = internalState;
    }

    if (options?.deriveCardano) {
      payload.derive_cardano = true;
    }

    Log.debug('initialize payload:', payload);

    const { message } = await this.commands.typedCall('Initialize', 'Features', payload);
    this._updateFeatures(message, options?.initSession);

    await TransportManager.reconfigure(message);
  }

  async getFeatures() {
    const { message } = await this.commands.typedCall('GetFeatures', 'Features', {});
    this._updateFeatures(message);
  }

  _updateFeatures(feat: Features, initSession?: boolean) {
    // GetFeatures doesn't return 'session_id'
    if (this.features && this.features.session_id && !feat.session_id) {
      feat.session_id = this.features.session_id;
    }
    if (this.features && this.features.device_id && feat.session_id) {
      this.setInternalState(feat.session_id, initSession);
    }
    feat.unlocked = feat.unlocked ?? true;

    this.features = feat;
    this.featuresNeedsReload = false;
    this.emit(DEVICE.FEATURES, this, feat);
  }

  /**
   * 暂时只在 acquire 后更新 Session ID
   * 后续看是否有需要依据 listen 返回结果更新
   * @param descriptor
   */
  updateDescriptor(descriptor: DeviceDescriptor, forceUpdate = false) {
    const env = DataManager.getSettings('env');
    if (DataManager.isBleConnect(env)) {
      return;
    }
    const originalSession = this.originalDescriptor.session;
    const upcomingSession = descriptor.session;

    if (originalSession !== upcomingSession) {
      this.originalDescriptor.session = upcomingSession;
    }

    if (forceUpdate) {
      this.originalDescriptor = descriptor;
    }
  }

  updateFromCache(device: Device) {
    this.mainId = device.mainId;
    this.commands = device.commands;
    this.updateDescriptor(device.originalDescriptor, true);
    if (device.features) {
      this._updateFeatures(device.features);
    }
  }

  async run(fn?: () => Promise<void>, options?: RunOptions) {
    if (this.runPromise) {
      await this.interruptionFromOutside();
      Log.debug('[Device] run error:', 'Device is running, but will cancel previous operate');
    }

    options = parseRunOptions(options);

    this.runPromise = createDeferred(this._runInner.bind(this, fn, options));
    return this.runPromise.promise;
  }

  async _runInner<T>(fn: (() => Promise<T>) | undefined, options: RunOptions) {
    if (!this.isUsedHere() || this.commands.disposed) {
      const env = DataManager.getSettings('env');
      if (env !== 'react-native') {
        await this.acquire();
        try {
          if (fn) {
            await this.initialize(options);
          }
        } catch (error) {
          this.runPromise = null;
          if (error instanceof HardwareError) {
            return Promise.reject(error);
          }
          return Promise.reject(
            ERRORS.TypedError(
              HardwareErrorCode.DeviceInitializeFailed,
              `Initialize failed: ${error.message as string}, code: ${error.code as string}`
            )
          );
        }
      }
    }

    if (options.keepSession) {
      this.keepSession = true;
    }

    if (fn) {
      try {
        await fn();
      } catch (e) {
        if (this.runPromise) {
          this.runPromise.reject(e);
        }

        this.runPromise = null;
        return;
      }
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

  async interruptionFromOutside() {
    if (this.commands) {
      await this.commands.dispose(false);
    }
    if (this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside));
    }
  }

  async interruptionFromUser() {
    if (this.commands) {
      await this.commands.dispose(true);
    }
    if (this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser));
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
    if (DataManager.isBleConnect(env)) {
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

  hasUsePassphrase() {
    const isModeT =
      getDeviceType(this.features) === 'touch' || getDeviceType(this.features) === 'pro';
    const preCheckTouch = isModeT && this.features?.unlocked === false;

    return this.features && (!!this.features.passphrase_protection || preCheckTouch);
  }

  checkDeviceId(deviceId: string) {
    if (this.features) {
      return this.features.device_id === deviceId;
    }
    return false;
  }

  async checkPassphraseStateSafety(passphraseState?: string) {
    if (!this.features) return false;
    const newState = await getPassphraseStateWithRefreshDeviceInfo(this);

    // When exists passphraseState, check passphraseState
    if (passphraseState && passphraseState !== newState) {
      this.clearInternalState();
      return false;
    }

    return true;
  }
}

export default Device;
