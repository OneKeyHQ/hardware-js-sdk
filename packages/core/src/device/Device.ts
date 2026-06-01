import EventEmitter from 'events';
import semver from 'semver';
import { Enum_Capability } from '@onekeyfe/hd-transport';
import {
  EDeviceType,
  ERRORS,
  ERROR_CODES_REQUIRE_DISCONNECT,
  ERROR_CODES_REQUIRE_RELEASE,
  HardwareError,
  HardwareErrorCode,
  createDeferred,
} from '@onekeyfe/hd-shared';

import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBleName,
  getDeviceFirmwareVersion,
  getDeviceLabel,
  getDeviceType,
  getDeviceUUID,
  getLogger,
  getMethodVersionRange,
} from '../utils';
import {
  fixFeaturesFirmwareVersion,
  getPassphraseStateWithRefreshDeviceInfo,
} from '../utils/deviceFeaturesUtils';
import { generateInstanceId } from '../utils/tracing';
// eslint-disable-next-line import/no-cycle
import { DeviceCommands } from './DeviceCommands';
import {
  type DeviceFirmwareRange,
  type Device as DeviceTyped,
  EOneKeyDeviceMode,
  type Features,
  type UnavailableCapabilities,
} from '../types';
import { DEVICE, UI_REQUEST } from '../events';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';
import { toHardened } from '../api/helpers/pathUtils';
import { existCapability } from '../utils/capabilitieUtils';
import { getProtocolV2Features } from '../protocols/protocol-v2';

import type { PROTO } from '../constants';
import type {
  DeviceButtonRequestPayload,
  DeviceFeaturesPayload,
  PassphraseRequestPayload,
} from '../events';
import type { PassphrasePromptResponse } from './DeviceCommands';
import type { Deferred, HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import type DeviceConnector from './DeviceConnector';

export type InitOptions = {
  initSession?: boolean;
  deviceId?: string;
  passphraseState?: string;
  deriveCardano?: boolean;
  connectProtocol?: HardwareConnectProtocol;
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
  [DEVICE.PASSPHRASE]: [
    Device,
    PassphraseRequestPayload,
    (response: PassphrasePromptResponse, error?: Error) => void
  ];
  [DEVICE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE]: [
    Device,
    (err: any, deviceId: string) => void
  ];
  [DEVICE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE]: [
    Device,
    (err: any, deviceId: string) => void
  ];
}

export interface Device {
  on<K extends keyof DeviceEvents>(type: K, listener: (...event: DeviceEvents[K]) => void): this;

  off<K extends keyof DeviceEvents>(type: K, listener: (...event: DeviceEvents[K]) => void): this;

  emit<K extends keyof DeviceEvents>(type: K, ...args: DeviceEvents[K]): boolean;
}

const deviceSessionCache: Record<string, string> = {};

/**
 * Pre-populate the device session cache with a known session ID.
 *
 * This allows short-lived processes (e.g. CLI) to restore a previously
 * obtained session, avoiding the need to re-enter passphrase on every
 * invocation. The session must have been obtained from a prior
 * getPassphraseState() call on the same device.
 *
 * @param deviceId - The device's device_id (from features)
 * @param passphraseState - The passphrase state token
 * @param sessionId - The session_id to cache (from features.session_id)
 */
export function preloadSessionCache(
  deviceId: string,
  passphraseState: string,
  sessionId: string
): void {
  const key = `${deviceId}@${passphraseState}`;
  deviceSessionCache[key] = sessionId;
}

export class Device extends EventEmitter {
  /**
   * 设备标识对象
   */
  originalDescriptor: DeviceDescriptor;

  sdkInstanceId?: string;

  /**
   * 设备实例唯一标识
   */
  instanceId: string;

  createdAt: number;

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
   * 可取消的操作
   */
  private cancelableAction?: (err?: Error) => Promise<unknown>;

  /**
   * 设备是否被占用
   */
  private deviceAcquired = false;

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

  pendingCallbackPromise?: Deferred<void>;

  constructor(descriptor: DeviceDescriptor, sdkInstanceId?: string) {
    super();
    this.originalDescriptor = descriptor;
    this.sdkInstanceId = sdkInstanceId;
    this.instanceId = generateInstanceId('Device', this.sdkInstanceId);
    this.createdAt = Date.now();
    Log.debug(
      `[Device] Created: ${this.instanceId}${
        this.sdkInstanceId ? ` for SDK: ${this.sdkInstanceId}` : ''
      }`
    );
  }

  static fromDescriptor(originalDescriptor: DeviceDescriptor, sdkInstanceId?: string) {
    const descriptor = { ...originalDescriptor };
    return new Device(descriptor, sdkInstanceId);
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
      commType: this.originalDescriptor.commType,
      sdkInstanceId: this.sdkInstanceId,
      instanceId: this.instanceId,
      createdAt: this.createdAt,
      deviceType,
      /** ID for current seeds, will clear after replace a new seed at device */
      deviceId: this.features.device_id || null,
      path: this.originalDescriptor?.path,
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
  connect(connectProtocol?: HardwareConnectProtocol) {
    const env = DataManager.getSettings('env');
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<boolean>(async (resolve, reject) => {
      if (DataManager.isBleConnect(env)) {
        try {
          await this.acquire(connectProtocol);
          resolve(true);
        } catch (error) {
          reject(error);
        }
        return;
      }
      // 不存在 Session ID 或存在 Session ID 但设备在别处使用，都需要 acquire 获取最新 sessionID
      if (!this.mainId || (!this.isUsedHere() && this.originalDescriptor)) {
        try {
          await this.acquire(connectProtocol);
          resolve(true);
        } catch (error) {
          reject(error);
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

  async acquire(connectProtocol?: HardwareConnectProtocol) {
    const env = DataManager.getSettings('env');
    const mainIdKey = DataManager.isBleConnect(env) ? 'id' : 'session';
    const expectedProtocol = connectProtocol ?? this.originalDescriptor.protocolType;
    try {
      let acquireResult: unknown;
      if (DataManager.isBleConnect(env)) {
        acquireResult = await this.deviceConnector?.acquire(
          this.originalDescriptor.id,
          undefined,
          true,
          expectedProtocol
        );
        this.mainId = (acquireResult as any)?.uuid ?? '';
        Log.debug('Expected uuid:', this.mainId);
      } else {
        acquireResult = await this.deviceConnector?.acquire(
          this.originalDescriptor.path,
          this.originalDescriptor.session,
          undefined,
          expectedProtocol
        );
        this.mainId = acquireResult as string | undefined;
        Log.debug('Expected session id:', this.mainId);
      }
      this.deviceAcquired = true;
      this.updateDescriptor({ [mainIdKey]: this.mainId } as unknown as DeviceDescriptor);

      // Propagate protocol version detected during acquire.
      const detectedProtocol =
        (acquireResult as { protocolType?: HardwareConnectProtocol } | undefined)?.protocolType ??
        TransportManager.transport?.getProtocolType?.(
          DataManager.isBleConnect(env) ? this.originalDescriptor.id : this.originalDescriptor.path
        );
      if (detectedProtocol) {
        this.originalDescriptor.protocolType = detectedProtocol;
      }

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
      // wait for callback tasks to complete before releasing device
      if (this.pendingCallbackPromise) {
        try {
          Log.debug(
            'Waiting for callback tasks to complete before releasing device (in release method)'
          );
          await this.pendingCallbackPromise.promise;
        } catch (error) {
          Log.error('Error waiting for callback tasks in release method:', error);
        }
      }

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
    this.deviceAcquired = false;
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
    Log.debug('getInternalState session cache: ', deviceSessionCache);
    Log.debug(
      'getInternalState session param: ',
      `device_id: ${_deviceId}`,
      `features.device_id: ${this.features?.device_id}`,
      `passphraseState: ${this.passphraseState}`
    );

    const deviceId = _deviceId || this.features?.device_id;
    if (!deviceId) return undefined;
    // Security invariant: no passphraseState → no session lookup.
    // A previous fallback that scanned `${deviceId}@*` keys could silently
    // route a standard-wallet (useEmptyPassphrase) or multi-hidden-wallet
    // caller onto the wrong cached session. CLI reuse is not affected:
    // prepareSession writes passphraseState into globalOpts so every
    // downstream call carries it and hits the primary lookup below.
    if (!this.passphraseState) return undefined;

    const usePassKey = this.generateStateKey(deviceId, this.passphraseState);
    return deviceSessionCache[usePassKey];
  }

  // attach to pin to fix internal state
  updateInternalState(
    enablePassphrase: boolean,
    passphraseState: string | undefined,
    deviceId: string,
    sessionId: string | null = null,
    featuresSessionId: string | null = null
  ) {
    Log.debug(
      'updateInternalState session param: ',
      `device_id: ${deviceId}`,
      `enablePassphrase: ${enablePassphrase}`,
      `passphraseState: ${passphraseState}`,
      `sessionId: ${sessionId}`,
      `featuresSessionId: ${featuresSessionId}`
    );

    if (enablePassphrase) {
      // update the sessionId
      if (sessionId) {
        deviceSessionCache[this.generateStateKey(deviceId, passphraseState)] = sessionId;
      } else if (featuresSessionId) {
        deviceSessionCache[this.generateStateKey(deviceId, passphraseState)] = featuresSessionId;
      }
    }

    // delete the old sessionId
    const oldKey = `${deviceId}`;
    if (deviceSessionCache[oldKey]) {
      delete deviceSessionCache[oldKey];
    }

    Log.debug('updateInternalState session cache: ', deviceSessionCache);
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
    // Protocol V2 不支持传统 Initialize，直接使用协议专用初始化流程。
    if (this.originalDescriptor.protocolType === 'V2') {
      this.passphraseState = options?.passphraseState;
      if (this.features && !this.featuresNeedsReload && !options?.initSession) {
        Log.debug('Skip Protocol V2 feature adapter; cached features are available');
        return;
      }
      await this._initializeProtocolV2();
      return;
    }

    // Log.debug('initialize param:', options);

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
    payload.passphrase_state = options?.passphraseState;
    payload.is_contains_attach = true;

    Log.debug('Initialize device begin:', {
      deviceId: options?.deviceId,
      passphraseState: options?.passphraseState,
      initSession: options?.initSession,
      InitializePayload: payload,
    });

    try {
      // @ts-expect-error
      const { message } = await Promise.race([
        this.commands.typedCall('Initialize', 'Features', payload),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));
            // iOS ble bound device timeout 20s
          }, 25 * 1000);
        }),
      ]);

      Log.debug('Initialize device end: ', message);
      this._updateFeatures(message, options?.initSession);
      await TransportManager.reconfigure(this.features);
    } catch (error) {
      Log.error('Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Device initialization over Protocol V2.
   *
   * Protocol V2 不走传统 Initialize/GetFeatures，直接用轻量 DeviceGetDeviceInfo
   * 归一成 legacy-style Features 视图。
   */
  private async _initializeProtocolV2() {
    Log.debug('Initialize device via Protocol V2 feature adapter');

    try {
      const features = await Promise.race([
        getProtocolV2Features({
          commands: this.commands,
          descriptor: this.originalDescriptor,
          timeoutMs: 10 * 1000,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));
          }, 10 * 1000);
        }),
      ]);
      Log.debug('Protocol V2 normalized features:', features);
      this._updateFeatures(features);
    } catch (error) {
      Log.error('Protocol V2 initialization failed:', error);
      throw error;
    }
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

    feat = fixFeaturesFirmwareVersion(feat);

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
        try {
          await this.acquire(options.connectProtocol);
        } catch (error) {
          this.runPromise = null;
          return Promise.reject(error);
        }

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
      } else if (env === 'react-native') {
        // TODO: implement react-native acquire
        // cancel input pin or passphrase on device request, then the following requests will report an error
        if (this.commands) {
          this.commands.disposed = false;
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

        if (
          e instanceof HardwareError &&
          ERROR_CODES_REQUIRE_RELEASE.includes(e.errorCode as any)
        ) {
          if (ERROR_CODES_REQUIRE_DISCONNECT.includes(e.errorCode as any)) {
            await this.deviceConnector?.disconnect(this.mainId);
          }
          await this.release();
          Log.debug(`error code ${e.errorCode} release device, mainId: ${this.mainId}`);
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
    const error = ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser);
    await this.cancelableAction?.(error);
    await this.commands?.cancel();

    if (this.runPromise) {
      this.runPromise.reject(error);
      this.runPromise = null;
    }
  }

  setCancelableAction(callback: (err?: Error) => Promise<unknown>) {
    this.cancelableAction = (e?: Error) =>
      callback(e)
        .catch(e2 => {
          Log.debug('cancelableAction error', e2);
        })
        .finally(() => {
          this.clearCancelableAction();
        });
  }

  clearCancelableAction() {
    this.cancelableAction = undefined;
  }

  getMode() {
    if (this.features?.bootloader_mode) {
      // bootloader mode
      return EOneKeyDeviceMode.bootloader;
    }

    if (!this.features?.initialized) {
      // not initialized
      return EOneKeyDeviceMode.notInitialized;
    }

    if (this.features?.no_backup) {
      // backup mode
      return EOneKeyDeviceMode.backupMode;
    }

    // normal mode
    return EOneKeyDeviceMode.normal;
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

  hasDeviceAcquire() {
    const env = DataManager.getSettings('env');
    if (DataManager.isBleConnect(env)) {
      return this.deviceAcquired;
    }
    return this.isUsed() && this.deviceAcquired;
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
      if (!this.isInitialized() && !allow.includes(UI_REQUEST.NOT_INITIALIZE)) {
        return UI_REQUEST.NOT_INITIALIZE;
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
      getDeviceType(this.features) === EDeviceType.Touch ||
      getDeviceType(this.features) === EDeviceType.Pro;
    const preCheckTouch = isModeT && this.features?.unlocked === false;

    return this.features && (!!this.features.passphrase_protection || preCheckTouch);
  }

  checkDeviceId(deviceId: string) {
    if (this.features) {
      return this.features.device_id === deviceId;
    }
    return false;
  }

  async lockDevice() {
    const res = await this.commands.typedCall('LockDevice', 'Success', {});
    return res.message;
  }

  supportUnlockVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.15.0',
      },
    };
  }

  async unlockDevice() {
    const firmwareVersion = getDeviceFirmwareVersion(this.features)?.join('.');
    const versionRange = getMethodVersionRange(
      this.features,
      type => this.supportUnlockVersionRange()[type]
    );

    const supportAttachPinCapability = existCapability(
      this.features,
      Enum_Capability.Capability_AttachToPin
    );
    const isPro2 = getDeviceType(this.features) === EDeviceType.Pro2;

    const supportUnlock =
      supportAttachPinCapability ||
      // Pro2 V2 暂未从 features 暴露 capabilities，先直连该方法用于固件联调。
      isPro2 ||
      (versionRange && semver.gte(firmwareVersion, versionRange.min));

    if (supportUnlock) {
      const res = await this.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
      if (this.features) {
        this.features.unlocked = res.message.unlocked == null ? null : res.message.unlocked;
        this.features.unlocked_attach_pin =
          res.message.unlocked_attach_pin == null ? undefined : res.message.unlocked_attach_pin;
        this.features.passphrase_protection =
          res.message.passphrase_protection == null ? null : res.message.passphrase_protection;

        return Promise.resolve(this.features);
      }

      const featuresRes = await this.commands.typedCall('GetFeatures', 'Features');
      this._updateFeatures(featuresRes.message);
      return Promise.resolve(featuresRes.message);
    }

    const { type } = await this.commands.typedCall('GetAddress', 'Address', {
      address_n: [toHardened(44), toHardened(1), toHardened(0), 0, 0],
      coin_name: 'Testnet',
      script_type: 'SPENDADDRESS',
      show_display: false,
    });

    // @ts-expect-error
    if (type === 'CallMethodError') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'unlock device error');
    }
    const res = await this.commands.typedCall('GetFeatures', 'Features');
    this._updateFeatures(res.message);
    return Promise.resolve(res.message);
  }

  async checkPassphraseStateSafety(
    passphraseState?: string,
    useEmptyPassphrase?: boolean,
    skipPassphraseCheck?: boolean
  ) {
    if (!this.features) return false;

    const { passphraseState: newPassphraseState, unlockedAttachPin } =
      await getPassphraseStateWithRefreshDeviceInfo(this, {
        expectPassphraseState: passphraseState,
        onlyMainPin: useEmptyPassphrase,
      });

    if (skipPassphraseCheck) {
      return true;
    }

    // Main wallet and unlock Attach Pin, throw safe error
    const mainWalletUseAttachPin = unlockedAttachPin && useEmptyPassphrase;
    const useErrorAttachPin =
      unlockedAttachPin && passphraseState && passphraseState !== newPassphraseState;

    Log.debug('Check passphrase state safety: ', {
      passphraseState,
      newPassphraseState,
      unlockedAttachPin,
      useEmptyPassphrase,
    });

    if (mainWalletUseAttachPin || useErrorAttachPin) {
      try {
        await this.lockDevice();
      } catch (error) {
        // ignore error
      }
      this.clearInternalState();
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError));
    }

    // When exists passphraseState, check passphraseState
    if (passphraseState && passphraseState !== newPassphraseState) {
      this.clearInternalState();
      return false;
    }

    return true;
  }
}

export default Device;
