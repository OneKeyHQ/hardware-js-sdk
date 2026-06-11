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
import {
  type DeviceFirmwareRange,
  DeviceModelToTypes,
  DeviceTypeToModels,
  type Device as DeviceTyped,
  EOneKeyDeviceMode,
  type Features,
  type IDeviceModel,
  type IDeviceType,
  type IVersionArray,
  type IVersionRange,
  type SupportFeatureType,
  type UnavailableCapabilities,
} from '../types';
import { DEVICE, UI_REQUEST } from '../events';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';
import { toHardened } from '../api/helpers/pathUtils';
import { existCapability } from '../utils/capabilitieUtils';
import {
  PROTOCOL_V2_STATUS_DEVICE_INFO_REQUEST,
  requestProtocolV2DeviceInfo,
} from '../protocols/protocol-v2/features';
import {
  buildProfileFromProtocolV1,
  buildProfileFromProtocolV2,
  buildProtocolV2GetFeaturesPayload,
} from '../deviceProfile';

import type { PROTO } from '../constants';
import type {
  DeviceButtonRequestPayload,
  DeviceFeaturesPayload,
  PassphraseRequestPayload,
} from '../events';
import type { PassphrasePromptResponse } from './DeviceCommands';
import type { Deferred, HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type { OneKeyDeviceInfo as DeviceDescriptor, Success } from '@onekeyfe/hd-transport';
import type DeviceConnector from './DeviceConnector';
import type { DeviceProfile } from '../types/api/getDeviceInfo';

export type InitOptions = {
  initSession?: boolean;
  deviceId?: string;
  passphraseState?: string;
  deriveCardano?: boolean;
  connectProtocol?: HardwareConnectProtocol;
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

const profileVersionToArray = (version?: string | null): IVersionArray | null => {
  if (!version) return null;
  return version.split('.').map(part => Number(part) || 0) as IVersionArray;
};

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
   * Protocol V1 原生 Features 缓存。
   *
   * SDK 内部标准设备模型是 profile；features 只作为 V1 原始状态和
   * getFeatures() legacy API 的兼容数据使用。Protocol V2 不缓存这里。
   */
  features: Features | undefined = undefined;

  /**
   * SDK 标准设备模型
   */
  profile: DeviceProfile | undefined = undefined;

  /**
   * 是否需要更新设备信息。
   *
   * 历史名称保留用于兼容现有调用语义；对 V2 表示 profile 需要刷新。
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
    const deviceId = this.getCurrentDeviceId() || null;

    // V2 设备不缓存 legacy features；DEVICE.FEATURES 等事件消费方
    // 仍依赖 features 字段，这里用 profile 生成兼容视图填充。
    const features =
      this.isProtocolV2() && this.profile
        ? fixFeaturesFirmwareVersion(buildProtocolV2GetFeaturesPayload(this.profile))
        : this.features;

    return {
      /** Android uses Mac address, iOS uses uuid, USB uses uuid  */
      connectId: DataManager.isBleConnect(env) ? this.mainId || null : serialNo,
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
      label: label || 'OneKey',
      mode: this.getMode(),
      features,
      profile: this.profile,
      sessionId: this.features?.session_id ?? null,
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
   * profile 是连接后探测出的最可信结果，优先于 descriptor 上的 transport 提示；
   * descriptor.protocolType 兜底（profile 建立前，例如 initialize 之前）。
   * 全 SDK 的协议分支都必须走这里，不要直接读 originalDescriptor.protocolType
   * 或 profile.protocol。
   */
  getProtocol(): 'V1' | 'V2' {
    if (this.profile?.protocol === 'V2') return 'V2';
    if (this.profile?.protocol === 'V1') return 'V1';
    return this.originalDescriptor.protocolType === 'V2' ? 'V2' : 'V1';
  }

  isProtocolV2() {
    return this.getProtocol() === 'V2';
  }

  getCurrentDeviceType() {
    return this.profile?.deviceType ?? getDeviceType(this.features);
  }

  getCurrentDeviceId() {
    if (this.profile) {
      return this.profile.deviceId || undefined;
    }
    return this.features?.device_id || undefined;
  }

  getCurrentSerialNo() {
    if (this.profile) {
      return this.profile.serialNo || '';
    }
    return this.features ? getDeviceUUID(this.features) : '';
  }

  getCurrentBleName() {
    // V2 不回退 legacy features，避免缓存残留的 V1 数据泄漏到 Pro2 视图
    if (this.isProtocolV2()) return this.profile?.bleName ?? null;
    return this.profile?.bleName ?? getDeviceBleName(this.features);
  }

  getCurrentLabel() {
    if (this.isProtocolV2()) return this.profile?.label ?? null;
    return this.profile?.label ?? getDeviceLabel(this.features);
  }

  getCurrentPassphraseProtection() {
    if (this.profile) {
      return this.profile.status.passphraseProtection;
    }
    return this.features?.passphrase_protection;
  }

  getCurrentFirmwareType() {
    return this.profile?.firmwareType ?? getFirmwareType(this.features);
  }

  getCurrentFirmwareVersionString() {
    return this.profile?.versions.firmware ?? getDeviceFirmwareVersion(this.features)?.join('.');
  }

  getCurrentBLEFirmwareVersionString() {
    if (this.profile?.versions.ble) return this.profile.versions.ble;
    if (!this.features) return undefined;
    return getDeviceBLEFirmwareVersion(this.features).join('.');
  }

  getCurrentSafetyChecks() {
    return this.features?.safety_checks;
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
      `profile.deviceId: ${this.profile?.deviceId}`,
      `passphraseState: ${this.passphraseState}`
    );

    const deviceId = _deviceId || this.getCurrentDeviceId();
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
      `profile.deviceId: ${this.profile?.deviceId}`,
      `passphraseState: ${this.passphraseState}`
    );

    if (!this.passphraseState && !initSession) return;

    const deviceId = this.getCurrentDeviceId();
    if (!deviceId) return;

    const key = this.generateStateKey(deviceId, this.passphraseState);

    if (state) {
      deviceSessionCache[key] = state;
    }
    Log.debug('setInternalState done session cache: ', deviceSessionCache);
  }

  clearInternalState(_deviceId?: string) {
    Log.debug('clearInternalState param: ', _deviceId);

    const deviceId = _deviceId || this.getCurrentDeviceId();
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
    if (this.isProtocolV2()) {
      this.passphraseState = options?.passphraseState;
      if (this.profile && !this.featuresNeedsReload && !options?.initSession) {
        // 不能直接信任缓存 profile：设备端 wipe / 完成初始化 / 改 label 后
        // profile 会永久陈旧。每次 run 做一次轻量 status 刷新（不含 fw/SE，
        // 单帧请求开销很小），用 applyProfileUpdate 字段级合并，
        // 不会降级已有的 verify / SE versions 数据。
        await this._refreshProtocolV2Status();
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
   * Protocol V2 不走传统 Initialize/GetFeatures，只建立标准 DeviceProfile。
   * legacy Features 只在 getFeatures() 兼容出口临时生成。
   */
  private async _initializeProtocolV2() {
    Log.debug('Initialize device via Protocol V2 profile adapter');

    try {
      // 超时由 requestProtocolV2DeviceInfo 内部的 typedCall timeoutMs（默认 10s）负责，
      // 不再额外包一层 Promise.race：外层 race 的 timer 不会清理，
      // 且 reject 后底层调用仍会残留。
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.commands,
      });
      // 默认请求不含 SE/hash 数据，scope 如实标注为 basic；
      // 完整数据由 getDeviceInfo(scope:'verify'|'full') 获取。
      const profile = this.applyProfileUpdate(
        buildProfileFromProtocolV2({
          deviceInfo,
          sources: ['deviceInfo'],
          scope: 'basic',
          fallbackSerialNo: this.originalDescriptor?.path,
        })
      );
      Log.debug('Protocol V2 profile:', profile);
      this.featuresNeedsReload = false;
    } catch (error) {
      Log.error('Protocol V2 initialization failed:', error);
      throw error;
    }
  }

  /**
   * Protocol V2 的轻量状态刷新（每次 run 前调用）。
   *
   * 请求 hw + bt + status（不含 fw/SE target）：status 提供 init_states / label /
   * passphrase_protection 等会在设备端变化的字段；hw/bt 提供 serialNo / bleName，
   * 避免 applyProfileUpdate 的顶层字段覆盖把已有身份字段清空。
   * versions 为空时按字段级合并保留旧值，verify 数据不会被降级。
   */
  private async _refreshProtocolV2Status() {
    try {
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.commands,
        request: PROTOCOL_V2_STATUS_DEVICE_INFO_REQUEST,
      });
      const profile = this.applyProfileUpdate(
        buildProfileFromProtocolV2({
          deviceInfo,
          sources: ['deviceInfo'],
          scope: 'basic',
          fallbackSerialNo: this.originalDescriptor?.path,
        })
      );
      Log.debug('Protocol V2 profile (status refresh):', profile);
    } catch (error) {
      Log.error('Protocol V2 status refresh failed:', error);
      throw error;
    }
  }

  async getFeatures() {
    if (this.isProtocolV2()) {
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.commands,
      });
      const profile = this.applyProfileUpdate(
        buildProfileFromProtocolV2({
          deviceInfo,
          sources: ['deviceInfo'],
          scope: 'basic',
          fallbackSerialNo: this.originalDescriptor?.path,
        })
      );
      return fixFeaturesFirmwareVersion(buildProtocolV2GetFeaturesPayload(profile, deviceInfo));
    }

    const { message } = await this.commands.typedCall('GetFeatures', 'Features', {});
    this._updateFeatures(message);
    return message;
  }

  _updateFeatures(feat: Features, initSession?: boolean) {
    // GetFeatures doesn't return 'session_id'
    if (this.features && this.features.session_id && !feat.session_id) {
      feat.session_id = this.features.session_id;
    }
    if (this.getCurrentDeviceId() && feat.session_id) {
      this.setInternalState(feat.session_id, initSession);
    }
    feat.unlocked = feat.unlocked ?? true;

    feat = fixFeaturesFirmwareVersion(feat);

    this.features = feat;
    if (!this.isProtocolV2()) {
      this.updateProfile(
        buildProfileFromProtocolV1({
          features: feat,
          sources: ['features'],
        })
      );
    }
    this.featuresNeedsReload = false;
    this.emit(DEVICE.FEATURES, this, feat);
  }

  updateProfile(profile: DeviceProfile | undefined) {
    this.profile = profile;
  }

  /**
   * 字段级合并刷新 profile，并返回合并后的结果。
   *
   * basic 范围的刷新（initialize / getFeatures）拿不到 SE 版本和 verify 数据，
   * 不能整体替换掉 getDeviceInfo(scope:'verify'|'full') 建立的完整 profile。
   */
  applyProfileUpdate(next: DeviceProfile): DeviceProfile {
    const prev = this.profile;
    if (!prev || prev.protocol !== next.protocol) {
      this.updateProfile(next);
      return next;
    }

    const versions = { ...prev.versions };
    for (const [key, value] of Object.entries(next.versions)) {
      if (value != null) {
        (versions as Record<string, string | null | undefined>)[key] = value;
      }
    }

    const merged: DeviceProfile = {
      ...prev,
      ...next,
      versions,
      verify: next.verify ?? prev.verify,
      raw: next.raw ?? prev.raw,
    };
    this.updateProfile(merged);
    return merged;
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
    this.updateProfile(device.profile);
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
    if (this.profile) {
      if (this.profile.status.mode === 'bootloader') return EOneKeyDeviceMode.bootloader;
      if (this.profile.status.mode === 'notInitialized') return EOneKeyDeviceMode.notInitialized;
      if (this.profile.status.noBackup === true) return EOneKeyDeviceMode.backupMode;
      if (this.profile.status.mode === 'normal') return EOneKeyDeviceMode.normal;
      // mode 'unknown'（V2 设备未上报 init_states）保守按未初始化处理，
      // 与 isInitialized() 的 fail-closed 行为保持一致。
      if (this.isProtocolV2()) return EOneKeyDeviceMode.notInitialized;
    }

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
    const profileVersion = profileVersionToArray(this.profile?.versions.firmware);
    if (profileVersion) return profileVersion;
    if (this.isProtocolV2()) return null;
    if (!this.features) return null;
    return getDeviceFirmwareVersion(this.features);
  }

  getBLEFirmwareVersion() {
    const profileVersion = profileVersionToArray(this.profile?.versions.ble);
    if (profileVersion) return profileVersion;
    if (this.isProtocolV2()) return null;
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
    if (this.profile) {
      return (
        this.profile.status.mode === 'bootloader' || this.profile.status.bootloaderMode === true
      );
    }
    return this.features && !!this.features.bootloader_mode;
  }

  isInitialized() {
    if (this.profile) {
      if (this.profile.status.initialized != null) return this.profile.status.initialized;
      if (this.profile.status.mode === 'normal') return true;
      if (this.profile.status.mode === 'notInitialized') return false;
      // V2 设备未上报 init_states 时按未初始化处理（fail-closed）：
      // 未知状态放行会让未初始化设备绕过 NOT_INITIALIZE 门禁。
      if (this.isProtocolV2()) return false;
      if (this.features) return !!this.features.initialized;
      return false;
    }
    return this.features && !!this.features.initialized;
  }

  isSeedless() {
    if (this.profile) {
      return this.profile.status.noBackup === true;
    }
    return this.features && !!this.features.no_backup;
  }

  isUnacquired(): boolean {
    return this.features === undefined && this.profile === undefined;
  }

  hasUnexpectedMode(allow: string[], require: string[]) {
    // both allow and require cases might generate single unexpected mode
    if (!this.isUnacquired()) {
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
    const deviceType = this.getCurrentDeviceType();
    const isModeT =
      deviceType === EDeviceType.Touch ||
      deviceType === EDeviceType.Pro ||
      deviceType === EDeviceType.Pro2;
    const unlocked = this.profile ? this.profile.status.unlocked : this.features?.unlocked;
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
    // 仅适用于 Protocol V1 的 Pro 系列；Pro2 走独立版本线，
    // 且 Protocol V2 固件从首个版本即支持 UnLockDevice（见 unlockDevice 的 isProtocolV2 短路）。
    return {
      pro: {
        min: '4.15.0',
      },
    };
  }

  async unlockDevice() {
    const firmwareVersion = this.getCurrentFirmwareVersionString() ?? '0.0.0';
    // profile 优先的版本范围解析；features 仅作为 V1 capability 判断来源
    const versionRange = this.getCurrentMethodVersionRange(
      type => this.supportUnlockVersionRange()[type]
    );

    const supportAttachPinCapability = existCapability(
      this.features,
      Enum_Capability.Capability_AttachToPin
    );
    // Pro2 (Protocol V2) 版本线独立于 Pro 系列，固件从首个版本即支持 UnLockDevice
    const supportUnlock =
      this.isProtocolV2() ||
      supportAttachPinCapability ||
      (versionRange &&
        semver.valid(firmwareVersion) &&
        semver.gte(firmwareVersion, versionRange.min));

    if (supportUnlock) {
      const res = await this.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
      // 解锁结果同步到 profile（标准模型），features 仅在 V1 缓存存在时回写
      if (this.profile) {
        this.updateProfile({
          ...this.profile,
          status: {
            ...this.profile.status,
            unlocked: res.message.unlocked == null ? null : res.message.unlocked,
            ...(res.message.passphrase_protection != null
              ? { passphraseProtection: res.message.passphrase_protection }
              : {}),
          },
        });
      }
      if (this.features) {
        this.features.unlocked = res.message.unlocked == null ? null : res.message.unlocked;
        this.features.unlocked_attach_pin =
          res.message.unlocked_attach_pin == null ? undefined : res.message.unlocked_attach_pin;
        this.features.passphrase_protection =
          res.message.passphrase_protection == null ? null : res.message.passphrase_protection;

        return Promise.resolve(this.features);
      }

      const features = await this.getFeatures();
      return Promise.resolve(features);
    }

    // legacy 解锁探测仅适用于 Protocol V1 老固件；V2 固件必然支持 UnLockDevice
    if (this.isProtocolV2()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'unlock device error: device firmware does not support UnLockDevice'
      );
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
