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
  createDeviceNotSupportMethodError,
} from '@onekeyfe/hd-shared';

import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBleName,
  getDeviceFirmwareVersion,
  getDeviceLabel,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
  getLogger,
} from '../utils';
import {
  fixFeaturesFirmwareVersion,
  getPassphraseStateWithRefreshDeviceInfo,
  supportInputPinOnSoftware,
  supportModifyHomescreen,
} from '../utils/deviceFeaturesUtils';
import { generateInstanceId } from '../utils/tracing';
// eslint-disable-next-line import/no-cycle
import { DeviceCommands } from './DeviceCommands';
import { mergeDeviceFeaturesPatch } from './DeviceFeaturesState';
import { mapFeaturesToState } from './DeviceStateMapper';
import { projectFeatures } from './DeviceStateProjector';
import { DeviceStateStore } from './DeviceStateStore';
import { deviceWalletSessionStore } from './DeviceWalletSessionStore';
import {
  type DeviceFirmwareRange,
  DeviceModelToTypes,
  DeviceTypeToModels,
  type Device as DeviceTyped,
  type DeviceStateEvent,
  type DeviceStatePatch,
  type DeviceStateUpdateSource,
  EOneKeyDeviceMode,
  type Features,
  type IDeviceModel,
  type IDeviceType,
  type IVersionRange,
  type SupportFeatureType,
  type UnavailableCapabilities,
} from '../types';
import { DEVICE, UI_REQUEST } from '../events';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';
import { toHardened } from '../api/helpers/pathUtils';
import { existCapability } from '../utils/capabilitieUtils';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import { buildProtocolV1FeaturesPayload, buildProtocolV2FeaturesPayload } from '../deviceProfile';

import type { PROTO } from '../constants';
import type {
  DeviceButtonRequestPayload,
  DeviceFeaturesPayload,
  PassphraseRequestPayload,
} from '../events';
import type { PassphrasePromptResponse } from './DeviceCommands';
import type { Deferred, HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type {
  OneKeyDeviceInfo as DeviceDescriptor,
  DeviceStatus,
  ProtocolV2DeviceInfo,
  Success,
} from '@onekeyfe/hd-transport';
import type DeviceConnector from './DeviceConnector';

export type InitOptions = {
  initSession?: boolean;
  deviceId?: string;
  passphraseState?: string;
  deriveCardano?: boolean;
  connectProtocol?: HardwareConnectProtocol;
  protocolV2DeviceInfoTimeoutMs?: number;
};

export type RunOptions = {
  keepSession?: boolean;
  skipInitialize?: boolean;
} & InitOptions;

const parseRunOptions = (options?: RunOptions): RunOptions => {
  if (!options) options = {};
  return options;
};

const Log = getLogger(LoggerNames.Device);

export interface DeviceEvents {
  [DEVICE.PIN]: [Device, PROTO.PinMatrixRequestType | undefined, (err: any, pin: string) => void];
  [DEVICE.PASSPHRASE_ON_DEVICE]: [Device, PassphraseRequestPayload?];
  [DEVICE.ATTACH_PIN_ON_DEVICE]: [Device, PassphraseRequestPayload?];
  [DEVICE.BUTTON]: [Device, DeviceButtonRequestPayload];
  [DEVICE.FEATURES]: [Device, DeviceFeaturesPayload];
  [DEVICE.STATE]: [Device, DeviceStateEvent];
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
  deviceWalletSessionStore.set(deviceId, passphraseState, sessionId);
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

  /** 唯一设备状态缓存。旧 Features 仅通过 getter/setter 做兼容投影。 */
  private stateStore = new DeviceStateStore();

  get state() {
    return this.stateStore.getState();
  }

  get features(): Features | undefined {
    return this.state ? projectFeatures(this.state) : undefined;
  }

  set features(features: Features | undefined) {
    this.stateStore = new DeviceStateStore();
    if (features) {
      this.stateStore.update(mapFeaturesToState(features), 'compatibility');
    }
  }

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

  /** Pre-initialize timestamp (ms) */
  private preInitializedAt?: number;

  /** Pre-initialize context, used to verify state consistency before skipping */
  private preInitializeMeta?: {
    passphraseState?: string;
  };

  /** Last Initialize duration (ms), reported as "saved" when a skip happens */
  private lastInitializeDurationMs?: number;

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
    if (this.isUnacquired()) return null;

    const env = DataManager.getSettings('env');
    const deviceType = this.getCurrentDeviceType();

    const bleName = this.getCurrentBleName();
    const label = this.getCurrentLabel();
    const serialNo = this.getCurrentSerialNo();
    const connectId = this.getConnectId();
    const deviceId = this.getCurrentDeviceId() || null;

    const { features, state } = this;

    return {
      /** Android uses Mac address, iOS uses uuid, USB uses uuid  */
      connectId: DataManager.isBleConnect(env) ? this.mainId || null : connectId,
      /** Hardware ID, will not change at any time */
      uuid: serialNo,
      commType: this.originalDescriptor.commType,
      sdkInstanceId: this.sdkInstanceId,
      instanceId: this.instanceId,
      createdAt: this.createdAt,
      deviceType,
      /** ID for current seeds, will clear after replace a new seed at device */
      deviceId,
      path: this.originalDescriptor?.path,
      bleName,
      name: bleName || label || `OneKey ${deviceType?.toUpperCase()}`,
      displayName: label || bleName || `OneKey ${deviceType?.toUpperCase()}`,
      label: label || 'OneKey',
      mode: this.getMode(),
      features,
      state,
      sessionId: this.features?.sessionId ?? null,
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

  async acquire(
    connectProtocol?: HardwareConnectProtocol,
    options?: { throwOnRunPromiseError?: boolean }
  ) {
    const env = DataManager.getSettings('env');
    const mainIdKey = DataManager.isBleConnect(env) ? 'id' : 'session';
    const expectedProtocol = connectProtocol ?? this.originalDescriptor.protocolType;
    try {
      let acquireResult: unknown;
      if (DataManager.isBleConnect(env)) {
        // forceCleanRunPromise=true（自 e21b83c6 引入，修复 Pro2 BLE 重连）：
        // acquire 意味着开启一个全新会话，transport 里残留的上一次 runPromise
        // 必然属于已死亡的会话（如固件升级重启、探测中断），不清理会让新会话的
        // 调用被旧 promise 卡死。无法在 Device 层面区分“重连恢复”与普通 acquire，
        // 因此对 BLE acquire 恒清理是有意为之。
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
      if (options?.throwOnRunPromiseError) {
        throw error;
      }
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

  /**
   * Pre-initialize: connect + Initialize ahead of the sign.
   */
  async preInitialize(initOptions?: InitOptions) {
    if (this.isUnacquired()) {
      await this.acquire();
      await this.initialize(initOptions);
    }
    this.markPreInitialized({
      passphraseState: initOptions?.passphraseState,
    });
  }

  markPreInitialized(meta?: { passphraseState?: string }) {
    this.preInitializedAt = Date.now();
    this.preInitializeMeta = meta
      ? {
          passphraseState: meta.passphraseState === '' ? undefined : meta.passphraseState,
        }
      : undefined;
  }

  clearPreInitialized() {
    this.preInitializedAt = undefined;
    this.preInitializeMeta = undefined;
  }

  isPreInitializeMetaMatch(payload?: { passphraseState?: string }) {
    if (!this.preInitializeMeta) return true;
    const passphraseState = payload?.passphraseState === '' ? undefined : payload?.passphraseState;
    return this.preInitializeMeta.passphraseState === passphraseState;
  }

  isPreInitializedValid(ttlMs: number) {
    if (!this.preInitializedAt) return false;
    return Date.now() - this.preInitializedAt <= ttlMs;
  }

  setLastInitializeDuration(durationMs: number) {
    this.lastInitializeDurationMs = durationMs;
  }

  getLastInitializeDuration() {
    return this.lastInitializeDurationMs;
  }

  getCommands() {
    return this.commands;
  }

  /**
   * 唯一协议判别器。
   *
   * descriptor.protocolType 是协议探测后的结果；V2 features 由 DeviceInfoGet
   * 映射产生。
   * 全 SDK 的协议分支都必须走这里，不要直接读 originalDescriptor.protocolType
   * 或从 features 反推。
   */
  getProtocol(): 'V1' | 'V2' {
    return this.originalDescriptor.protocolType === 'V2' ? 'V2' : 'V1';
  }

  isProtocolV2() {
    return this.getProtocol() === 'V2';
  }

  getCurrentDeviceType() {
    return getDeviceType(this.features);
  }

  getCurrentDeviceId() {
    return this.features?.deviceId || undefined;
  }

  getCurrentSerialNo() {
    return this.features ? getDeviceUUID(this.features) : '';
  }

  getConnectId() {
    const serialNo = this.getCurrentSerialNo();
    if (serialNo) return serialNo;

    // connectId 是 SDK 内部连接路由 key。这里兜底到 transport descriptor，
    // 不改变 features.serialNo / deviceId 的业务语义。
    return this.originalDescriptor.path || this.originalDescriptor.id || '';
  }

  getCurrentBleName() {
    return getDeviceBleName(this.features);
  }

  getCurrentLabel() {
    return getDeviceLabel(this.features);
  }

  getCurrentPassphraseProtection() {
    return this.features?.passphraseProtection;
  }

  getCurrentFirmwareType() {
    return getFirmwareType(this.features);
  }

  getCurrentFirmwareVersionString() {
    return getDeviceFirmwareVersion(this.features)?.join('.');
  }

  getCurrentBLEFirmwareVersionString() {
    if (!this.features) return undefined;
    return getDeviceBLEFirmwareVersion(this.features).join('.');
  }

  getCurrentSafetyChecks() {
    return this.features?.safetyChecks;
  }

  getCurrentMethodVersionRange(
    getVersionRange: (deviceModel: IDeviceType | IDeviceModel) => IVersionRange | undefined
  ) {
    const deviceType = this.getCurrentDeviceType();
    const versionRange = getVersionRange(deviceType);
    if (versionRange) return versionRange;

    // Most-specific model first; must match getMethodVersionRange in deviceInfoUtils,
    // otherwise e.g. Classic1s resolves the looser model_mini range before model_classic1s.
    const modelFallbacks: IDeviceModel[] = [
      'model_classic1s',
      'model_classic',
      'model_mini',
      'model_touch',
    ];
    for (const model of modelFallbacks) {
      if (DeviceTypeToModels[deviceType]?.includes(model)) {
        const fallbackRange = getVersionRange(model);
        if (fallbackRange) return fallbackRange;
      }
    }
    return undefined;
  }

  supportNewPassphrase(): SupportFeatureType {
    const deviceType = this.getCurrentDeviceType();
    if (
      deviceType === EDeviceType.Touch ||
      deviceType === EDeviceType.Pro ||
      deviceType === EDeviceType.Pro2
    ) {
      return { support: true };
    }

    const firmwareVersion = this.getCurrentFirmwareVersionString();
    return {
      support: Boolean(firmwareVersion && semver.gte(firmwareVersion, '2.4.0')),
      require: '2.4.0',
    };
  }

  supportInputPinOnSoftware(): SupportFeatureType {
    if (this.features) return supportInputPinOnSoftware(this.features);

    const deviceType = this.getCurrentDeviceType();
    if (
      deviceType === EDeviceType.Touch ||
      deviceType === EDeviceType.Pro ||
      deviceType === EDeviceType.Pro2
    ) {
      return { support: false };
    }

    const firmwareVersion = this.getCurrentFirmwareVersionString();
    return {
      support: Boolean(firmwareVersion && semver.gte(firmwareVersion, '2.3.0')),
      require: '2.3.0',
    };
  }

  supportModifyHomescreen(): SupportFeatureType {
    // Pro2 走独立 1.x 版本线，不能套用 Touch/Pro 的 3.4.0 门槛（恒 false 且未来会误判）。
    // 依据：firmware-pro2 协议 schema（messages-protocol-v2.json）的 ApplySettings
    // 包含 homescreen 字段，V2 固件从首个版本即支持修改主屏。
    if (this.isProtocolV2()) {
      return { support: true };
    }

    if (this.features) return supportModifyHomescreen(this.features);

    const deviceType = this.getCurrentDeviceType();
    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
      return { support: true };
    }

    const firmwareVersion = this.getCurrentFirmwareVersionString();
    return {
      support: Boolean(firmwareVersion && semver.gte(firmwareVersion, '3.4.0')),
    };
  }

  private getSessionCacheDeviceKey(_deviceId?: string) {
    const deviceId = _deviceId || this.getCurrentDeviceId();
    if (deviceId) return deviceId;
    if (this.isProtocolV2()) {
      return this.originalDescriptor.path || this.originalDescriptor.id;
    }
    return undefined;
  }

  getInternalState(_deviceId?: string) {
    Log.debug(
      'getInternalState session param: ',
      `device_id: ${_deviceId}`,
      `features.deviceId: ${this.features?.deviceId}`,
      `passphraseState: ${this.passphraseState}`
    );

    const deviceId = this.getSessionCacheDeviceKey(_deviceId);
    if (!deviceId) return undefined;
    // Security invariant: no passphraseState → no session lookup.
    // A previous fallback that scanned `${deviceId}@*` keys could silently
    // route a standard-wallet (useEmptyPassphrase) or multi-hidden-wallet
    // caller onto the wrong cached session. CLI reuse is not affected:
    // prepareSession writes passphraseState into globalOpts so every
    // downstream call carries it and hits the primary lookup below.
    if (!this.passphraseState) return undefined;

    return deviceWalletSessionStore.get(deviceId, this.passphraseState);
  }

  // attach to pin to fix internal state
  updateInternalState(
    enablePassphrase: boolean,
    passphraseState: string | undefined,
    deviceId: string | undefined,
    sessionId: string | null = null,
    featuresSessionId: string | null = null
  ) {
    Log.debug(
      'updateInternalState session param: ',
      `device_id: ${deviceId}`,
      `enablePassphrase: ${enablePassphrase}`,
      `passphraseState: ${passphraseState}`,
      `hasSessionId: ${Boolean(sessionId)}`,
      `hasFeaturesSessionId: ${Boolean(featuresSessionId)}`
    );

    const cacheDeviceKey = this.getSessionCacheDeviceKey(deviceId);
    if (!cacheDeviceKey) return;

    if (enablePassphrase) {
      const walletSessionId =
        sessionId || featuresSessionId || deviceWalletSessionStore.getPending(cacheDeviceKey);
      deviceWalletSessionStore.set(cacheDeviceKey, passphraseState, walletSessionId ?? undefined);
    }

    deviceWalletSessionStore.deletePending(cacheDeviceKey);
  }

  private setInternalState(state: string, initSession?: boolean) {
    Log.debug(
      'setInternalState session param: ',
      `hasState: ${Boolean(state)}`,
      `initSession: ${initSession}`,
      `deviceId: ${this.features?.deviceId}`,
      `passphraseState: ${this.passphraseState}`
    );

    if (!this.passphraseState && !initSession) return;

    const deviceId = this.getSessionCacheDeviceKey();
    if (!deviceId) return;

    if (this.passphraseState) {
      deviceWalletSessionStore.set(deviceId, this.passphraseState, state);
    } else if (initSession) {
      deviceWalletSessionStore.setPending(deviceId, state);
    }
  }

  clearInternalState(_deviceId?: string) {
    Log.debug('clearInternalState param: ', _deviceId);

    const deviceId = this.getSessionCacheDeviceKey(_deviceId);
    if (!deviceId) return;
    deviceWalletSessionStore.deletePending(deviceId);

    if (this.passphraseState) {
      deviceWalletSessionStore.delete(deviceId, this.passphraseState);
    }
  }

  async initialize(options?: InitOptions) {
    // Protocol V2 不支持传统 Initialize，直接使用协议专用初始化流程。
    if (this.isProtocolV2()) {
      this.passphraseState = options?.passphraseState;
      if (this.state && !options?.initSession) {
        if (this.features?.bootloaderMode) {
          return;
        }
        // 普通业务调用复用缓存。动态状态由显式 getFeatures/deviceStatusGet、
        // 解锁流程和设备事件刷新，避免每个 SDK 方法都额外轮询 DeviceStatus。
        return;
      }
      await this._initializeProtocolV2(options);
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

    const initStartAt = Date.now();
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

      const initCostMs = Date.now() - initStartAt;
      this.setLastInitializeDuration(initCostMs);
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
   * Protocol V2 不走传统 Initialize/GetFeatures；直接用 DeviceInfoGet
   * 生成唯一的 features 状态。
   */
  private async _initializeProtocolV2(options?: InitOptions) {
    Log.debug('Initialize device via Protocol V2 features adapter');

    try {
      // 超时由 requestProtocolV2DeviceInfo 内部的 typedCall timeoutMs（默认 10s）负责，
      // 不再额外包一层 Promise.race：外层 race 的 timer 不会清理，
      // 且 reject 后底层调用仍会残留。
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.commands,
        timeoutMs: options?.protocolV2DeviceInfoTimeoutMs,
      });
      // 默认请求不含 SE/hash 数据，scope 如实标注为 basic；
      // 完整数据由 getDeviceInfo(scope:'verify'|'full') 获取。
      const features = this.updateProtocolV2Features(deviceInfo, null);
      Log.debug('Protocol V2 features:', features);
    } catch (error) {
      Log.error('Protocol V2 initialization failed:', error);
      throw error;
    }
  }

  async getFeatures() {
    if (this.isProtocolV2()) {
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.commands,
      });
      return this.updateProtocolV2Features(deviceInfo, null);
    }

    const { message } = await this.commands.typedCall('GetFeatures', 'Features', {});
    this._updateFeatures(message);
    return this.features;
  }

  _updateFeatures(protoFeatures: PROTO.Features | Features, initSession?: boolean) {
    const previousCacheDeviceKey = this.getSessionCacheDeviceKey();
    let feat =
      'protocol' in protoFeatures
        ? protoFeatures
        : buildProtocolV1FeaturesPayload(protoFeatures, this.features);

    // GetFeatures doesn't return 'session_id'
    if (this.features?.sessionId && !feat.sessionId) {
      feat.sessionId = this.features.sessionId;
    }
    feat.unlocked = feat.unlocked ?? true;

    feat = fixFeaturesFirmwareVersion(feat);

    this.updateState(mapFeaturesToState(feat), 'initialize');
    const nextCacheDeviceKey = this.getSessionCacheDeviceKey();
    if (previousCacheDeviceKey && nextCacheDeviceKey) {
      deviceWalletSessionStore.migrateDeviceKey(previousCacheDeviceKey, nextCacheDeviceKey);
    }
    if (feat.deviceId && feat.sessionId) {
      this.setInternalState(feat.sessionId, initSession);
    }
  }

  updateState(patch: DeviceStatePatch, source: DeviceStateUpdateSource) {
    const result = this.stateStore.update(patch, source);
    if (result.changedKeys.length === 0) return result.state;

    const event: DeviceStateEvent = {
      connectId: this.getConnectId() ?? null,
      state: result.state,
      revision: result.revision,
      source,
      changedKeys: result.changedKeys,
    };
    Log.debug('Device state patch committed', {
      source,
      keys: result.changedKeys,
    });
    this.emit(DEVICE.STATE, this, event);
    this.emit(DEVICE.FEATURES, this, projectFeatures(result.state));
    return result.state;
  }

  updateFeaturesPatch(patch: Partial<Features>, source: DeviceStateUpdateSource) {
    const currentFeatures = this.features;
    if (!currentFeatures) return undefined;

    const features = mergeDeviceFeaturesPatch(currentFeatures, patch);
    if (features === currentFeatures) return currentFeatures;

    const normalized = fixFeaturesFirmwareVersion(features);
    this.updateState(mapFeaturesToState(normalized), source);
    return this.features;
  }

  updateProtocolV2Features(deviceInfo?: ProtocolV2DeviceInfo, deviceStatus?: DeviceStatus | null) {
    const previousCacheDeviceKey = this.getSessionCacheDeviceKey();
    const resolvedDeviceStatus =
      deviceStatus === undefined
        ? this.features?.raw?.protocolV2DeviceStatus
        : deviceStatus ?? undefined;
    const features = fixFeaturesFirmwareVersion(
      buildProtocolV2FeaturesPayload({
        deviceInfo,
        deviceStatus: resolvedDeviceStatus,
        previous: this.features,
      })
    );
    this.updateState(mapFeaturesToState(features), 'device-info');
    const nextCacheDeviceKey = this.getSessionCacheDeviceKey();
    if (previousCacheDeviceKey && nextCacheDeviceKey) {
      deviceWalletSessionStore.migrateDeviceKey(previousCacheDeviceKey, nextCacheDeviceKey);
    }
    return this.features as Features;
  }

  updateProtocolV2Status(status: DeviceStatus) {
    const previousDeviceInfo = this.features?.raw?.protocolV2DeviceInfo;
    const previousStatus = this.features?.raw?.protocolV2DeviceStatus;
    return this.updateProtocolV2Features(previousDeviceInfo, {
      ...previousStatus,
      ...status,
    });
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
      // 枚举得到的 descriptor 可能不带 protocolType（如 WebUSB enumerate），
      // 不能让覆盖丢掉已探测的协议结果。
      this.originalDescriptor = {
        ...descriptor,
        protocolType: descriptor.protocolType ?? this.originalDescriptor.protocolType,
      };
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
            if (!options?.skipInitialize) {
              await this.initialize(options);
            }
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
    if (this.features?.bootloaderMode) {
      // bootloader mode
      return EOneKeyDeviceMode.bootloader;
    }

    if (!this.features?.initialized) {
      // not initialized
      return EOneKeyDeviceMode.notInitialized;
    }

    if (this.features?.noBackup) {
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
    return this.features && !!this.features.bootloaderMode;
  }

  isInitialized() {
    return this.features && !!this.features.initialized;
  }

  isSeedless() {
    return this.features && !!this.features.noBackup;
  }

  isUnacquired(): boolean {
    return this.features === undefined;
  }

  hasUnexpectedMode(allow: string[], require: string[]) {
    // both allow and require cases might generate single unexpected mode
    if (!this.isUnacquired()) {
      // allow cases
      if (this.isBootloader() && !this.isProtocolV2() && !allow.includes(UI_REQUEST.BOOTLOADER)) {
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
    const deviceType = this.getCurrentDeviceType();
    const isModeT =
      deviceType === EDeviceType.Touch ||
      deviceType === EDeviceType.Pro ||
      deviceType === EDeviceType.Pro2;
    const unlocked = this.features?.unlocked;
    const preCheckTouch = isModeT && unlocked === false;
    const passphraseProtection = this.getCurrentPassphraseProtection();

    return Boolean(passphraseProtection === true || preCheckTouch);
  }

  checkDeviceId(deviceId: string) {
    return this.getCurrentDeviceId() === deviceId;
  }

  async lockDevice(): Promise<Success> {
    const res = await this.commands.typedCall('LockDevice', 'Success', {});
    return res.message;
  }

  supportUnlockVersionRange(): DeviceFirmwareRange {
    // 仅适用于 Protocol V1 的 Pro 系列；Pro2 走独立的 Protocol V2 解锁流程。
    return {
      pro: {
        min: '4.15.0',
      },
    };
  }

  async unlockDevice() {
    if (this.isProtocolV2()) {
      try {
        await this.commands.typedCall('DeviceSessionAskPin', 'Success', undefined, {
          timeoutMs: 120_000,
        });
      } catch (error) {
        const errorText =
          error instanceof Error
            ? `${error.name} ${error.message}`
            : String((error as { message?: unknown } | null)?.message ?? error ?? '');
        if (errorText.includes('Failure_UnexpectedMessage')) {
          throw createDeviceNotSupportMethodError('deviceUnlock', this.getCurrentFirmwareType());
        }
        throw error;
      }

      return this.updateFeaturesPatch({ unlocked: true }, 'unlock');
    }

    const firmwareVersion = this.getCurrentFirmwareVersionString() ?? '0.0.0';
    const versionRange = this.getCurrentMethodVersionRange(
      type => this.supportUnlockVersionRange()[type]
    );

    const supportAttachPinCapability = existCapability(
      this.features,
      Enum_Capability.Capability_AttachToPin
    );
    const supportUnlock =
      supportAttachPinCapability ||
      (versionRange &&
        semver.valid(firmwareVersion) &&
        semver.gte(firmwareVersion, versionRange.min));

    if (supportUnlock) {
      const res = await this.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
      if (this.features) {
        this.updateState(
          {
            status: {
              unlocked: res.message.unlocked == null ? null : res.message.unlocked,
              unlockedAttachPin:
                res.message.unlocked_attach_pin == null
                  ? null
                  : res.message.unlocked_attach_pin,
              passphraseProtection:
                res.message.passphrase_protection == null
                  ? null
                  : res.message.passphrase_protection,
            },
          },
          'unlock'
        );

        return Promise.resolve(this.features);
      }

      const features = await this.getFeatures();
      return Promise.resolve(features);
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
    const features = await this.getFeatures();
    return Promise.resolve(features);
  }

  async checkPassphraseStateSafety(
    passphraseState?: string,
    useEmptyPassphrase?: boolean,
    skipPassphraseCheck?: boolean
  ) {
    if (this.isUnacquired()) return false;

    const { passphraseState: newPassphraseState, unlockedAttachPin } =
      await getPassphraseStateWithRefreshDeviceInfo(this, {
        expectPassphraseState: passphraseState,
        onlyMainPin: useEmptyPassphrase,
      });

    // Main wallet and unlock Attach Pin, throw safe error
    const mainWalletUseAttachPin = unlockedAttachPin && useEmptyPassphrase;
    const useErrorAttachPin =
      unlockedAttachPin && passphraseState && passphraseState !== newPassphraseState;
    const passphraseStateMismatch = !!passphraseState && passphraseState !== newPassphraseState;

    Log.debug('Check passphrase state safety: ', {
      passphraseState,
      newPassphraseState,
      unlockedAttachPin,
      useEmptyPassphrase,
    });

    if (skipPassphraseCheck) {
      if (passphraseStateMismatch) {
        this.clearInternalState();
        return false;
      }
      return true;
    }

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
    if (passphraseStateMismatch) {
      this.clearInternalState();
      return false;
    }

    return true;
  }
}

export default Device;
