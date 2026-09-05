import EventEmitter from 'events';
import semver from 'semver';
import { DeviceRebootType, DeviceSessionPinType, Enum_Capability } from '@onekeyfe/hd-transport';
import {
  EDeviceType,
  EFirmwareType,
  ERRORS,
  ERROR_CODES_REQUIRE_DISCONNECT,
  ERROR_CODES_REQUIRE_RELEASE,
  HardwareError,
  HardwareErrorCode,
  canonicalizePro2BleAdvertisementName,
  createDeferred,
  createDeviceNotSupportMethodError,
} from '@onekeyfe/hd-shared';

import { LoggerNames, getLogger } from '../utils';
import {
  fixFeaturesFirmwareVersion,
  getPassphraseStateWithRefreshDeviceInfo,
} from '../utils/deviceFeaturesUtils';
import { parseDeviceVersion } from '../utils/deviceVersionUtils';
import { generateInstanceId } from '../utils/tracing';
// eslint-disable-next-line import/no-cycle
import { DeviceCommands } from './DeviceCommands';
import { mergeDeviceFeaturesPatch } from './DeviceFeaturesState';
import {
  mapDeviceSettingsToState,
  mapFeaturesToState,
  mapProtocolV1OnekeyFeaturesToState,
  mapProtocolV2DeviceInfoToState,
  mapProtocolV2DeviceStatusToState,
} from './DeviceStateMapper';
import { projectFeatures } from './DeviceStateProjector';
import { DeviceStateStore, createPublicDeviceState } from './DeviceStateStore';
import { cloneDeviceState } from './cloneDeviceState';
import { deviceWalletSessionStore } from './DeviceWalletSessionStore';
import {
  type DeviceFirmwareRange,
  DeviceModelToTypes,
  type DeviceStateEvent,
  type DeviceStatePatch,
  type DeviceStateUpdateSource,
  DeviceTypeToModels,
  type Device as DeviceTyped,
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
import {
  PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE,
  PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
  PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST,
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
  type ProtocolV2RuntimeMode,
  getProtocolV2RuntimeMode,
  isLegacyProtocolV2ProtocolInfo,
  requestProtocolV2DeviceInfo,
  requestProtocolV2DeviceStatus,
  requestProtocolV2ProtocolInfo,
  supportsProtocolV2Message,
} from '../protocols/protocol-v2/features';
import { buildProtocolV1FeaturesPayload } from '../deviceProfile';
import { resolveProtocolV2DeviceIdentity } from '../deviceProfile/protocolV2DeviceIdentity';

import type { PROTO } from '../constants';
import type { DeviceStateReadOptions } from '../types/api/getDeviceState';
import type {
  DeviceButtonRequestPayload,
  DeviceFeaturesPayload,
  HardwareUiInteractionMeta,
  PassphraseRequestPayload,
  ProtocolV2UiEventMetadata,
} from '../events';
import type { PassphrasePromptResponse } from './DeviceCommands';
import type { Deferred, HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type {
  OneKeyDeviceInfo as DeviceDescriptor,
  DeviceStatus,
  ProtocolInfo,
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
  forceProtocolDetection?: boolean;
  protocolV2DeviceInfoTimeoutMs?: number;
  /** Refresh Protocol V2 runtime state before returning discovery results. */
  refreshRuntimeState?: boolean;
  /**
   * Protocol V1 Initialize response timeout override. Reboot-wait polling passes a
   * short value so an unanswered probe settles before the next poll tick.
   */
  timeoutMs?: number;
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

const isProtocolV2DeviceStatusUnsupportedError = (error: unknown) => {
  if (error instanceof HardwareError) {
    if (error.errorCode === HardwareErrorCode.DeviceNotSupportMethod) {
      return true;
    }
    if (error.params?.failureCode === 'Failure_UnexpectedMessage') {
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown } | null)?.message ?? error ?? '');
  return (
    /^Failure_UnexpectedMessage(?:,|\b)/i.test(message) ||
    /\b(?:unsupported message|handler not registered|message handler not found)\b/i.test(message)
  );
};

export interface DeviceEvents {
  [DEVICE.PIN]: [Device, PROTO.PinMatrixRequestType | undefined, (err: any, pin: string) => void];
  [DEVICE.PIN_ON_DEVICE]: [Device, DeviceSessionPinType, ProtocolV2UiEventMetadata?];
  [DEVICE.PIN_ON_DEVICE_COMPLETE]: [Device, HardwareUiInteractionMeta];
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
 * wallet-session call on the same device. This compatibility hook is intended
 * for a trusted CLI process restoring its own OS-keychain entry.
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

  /**
   * Connection-attempt generation. interruptionFromUser() pins the current
   * attempt so a late acquire cannot finish, while the next public connect
   * increments this and is allowed to proceed.
   */
  private connectionAttempt = 0;

  private interruptedAttempt: number | null = null;

  /** Canonical device-state cache; legacy Features is a compatibility projection. */
  private stateStore = new DeviceStateStore();

  /** Force the next initialization to reload DeviceInfo after reconnect or reboot. */
  private protocolV2StateNeedsReload = false;

  /** Runtime context negotiated once per active Protocol V2 link. */
  private protocolV2RuntimeContext?: ProtocolInfo;

  /** Coalesces concurrent first-use runtime negotiation on the same active link. */
  private protocolV2RuntimeContextPromise?: Promise<ProtocolInfo>;

  /** Invalidates an in-flight runtime-context response without adding a transport epoch. */
  private protocolV2RuntimeContextRequestToken?: object;

  private protocolV2UiInteraction?: {
    interactionId: string;
    phaseCounter: number;
    sequence: number;
    opened: boolean;
  };

  private protocolV2UiInteractionCounter = 0;

  get state() {
    return this.stateStore.getState();
  }

  get features(): Features | undefined {
    if (!this.state) return undefined;
    return projectFeatures(this.state);
  }

  set features(features: Features | undefined) {
    this.stateStore = new DeviceStateStore();
    if (features) {
      this.stateStore.update(mapFeaturesToState(features), 'compatibility');
      const { passphraseState } = features;
      const sessionId = features.sessionId ?? features.session_id;
      const deviceKey = this.getSessionCacheDeviceKey(features.deviceId ?? undefined);
      if (passphraseState && sessionId && deviceKey) {
        this.passphraseState = passphraseState;
        deviceWalletSessionStore.set(deviceKey, passphraseState, sessionId);
      }
    }
  }

  runPromise?: Deferred<void> | null;

  /** Resolves only after the active run has completed its release path. */
  private runCleanupPromise?: Promise<void>;

  private userInterruption?: { attempt: number; promise: Promise<void> };

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
    if (this.isUnacquired() || !this.features) return null;

    const env = DataManager.getSettings('env');
    const deviceType = this.getCurrentDeviceType();

    const bleName = this.getCurrentBleName();
    const displayName = this.getCurrentDisplayName();
    const serialNo = this.getCurrentSerialNo();
    const connectId = this.getConnectId();
    const deviceId = this.getCurrentDeviceId() || null;

    const { features } = this;
    const state = this.state ? createPublicDeviceState(this.state) : undefined;

    return {
      /** Android uses a MAC address, while iOS and USB use transport-specific identifiers. */
      connectId: DataManager.isBleConnect(env) ? this.mainId || null : connectId,
      /** Persist this after the first active probe so later calls do not need to guess. */
      connectProtocol: this.originalDescriptor.protocolType,
      /** Stable physical-device identity. */
      serialNo,
      /** @deprecated Use serialNo instead. */
      uuid: serialNo,
      commType: this.originalDescriptor.commType,
      sdkInstanceId: this.sdkInstanceId,
      instanceId: this.instanceId,
      createdAt: this.createdAt,
      deviceType,
      /** Wallet-lifecycle ID; changes after the device is wiped or reinitialized. */
      deviceId,
      path: this.originalDescriptor?.path,
      bleName,
      name: bleName || displayName || `OneKey ${deviceType?.toUpperCase()}`,
      // Keep the legacy top-level field string-compatible while preserving
      // the canonical nullable value at state.identity.label.
      label: displayName ?? '',
      status: this.getStatus(),
      mode: this.getMode(),
      features,
      state,
      firmwareVersion: this.getFirmwareVersion(),
      bleFirmwareVersion: this.getBLEFirmwareVersion(),
      unavailableCapabilities: this.unavailableCapabilities,
    };
  }

  /**
   * Device connect
   * @returns {Promise<boolean>}
   */
  connect(
    connectProtocol?: HardwareConnectProtocol,
    options?: { forceProtocolDetection?: boolean }
  ) {
    const env = DataManager.getSettings('env');
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<boolean>(async (resolve, reject) => {
      if (DataManager.isBleConnect(env)) {
        if (this.hasDeviceAcquire() && this.commands && !this.commands.disposed) {
          resolve(true);
          return;
        }
        try {
          await this.acquire(connectProtocol, options);
          resolve(true);
        } catch (error) {
          reject(error);
        }
        return;
      }
      // 不存在 Session ID 或存在 Session ID 但设备在别处使用，都需要 acquire 获取最新 sessionID
      if (!this.mainId || (!this.isUsedHere() && this.originalDescriptor)) {
        try {
          await this.acquire(connectProtocol, options);
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
    expectedProtocol?: HardwareConnectProtocol,
    options?: { throwOnRunPromiseError?: boolean; forceProtocolDetection?: boolean }
  ) {
    const attempt = this.connectionAttempt;
    this.throwIfInterruptedByUser();
    const env = DataManager.getSettings('env');
    const mainIdKey = DataManager.isBleConnect(env) ? 'id' : 'session';
    const previousProtocol = this.originalDescriptor.protocolType;
    // A protocol stored after a successful probe is authoritative. Only the explicit
    // first-connection/recovery path may bypass it and probe both protocols again.
    const strictProtocol = options?.forceProtocolDetection
      ? undefined
      : expectedProtocol ?? this.originalDescriptor.protocolType;
    try {
      let acquireResult: unknown;
      if (DataManager.isBleConnect(env)) {
        // acquire starts a new BLE session. Any previous runPromise belongs to a dead
        // session, such as an interrupted probe or firmware-update reboot, and would
        // otherwise block the new session. Device cannot distinguish recovery from a
        // regular acquire, so BLE always clears it intentionally.
        acquireResult = await this.deviceConnector?.acquire(
          this.originalDescriptor.id,
          undefined,
          true,
          strictProtocol,
          undefined,
          options?.forceProtocolDetection
        );
        this.mainId = (acquireResult as any)?.uuid ?? '';
        Log.debug('Expected uuid:', this.mainId);
      } else {
        acquireResult = await this.deviceConnector?.acquire(
          this.originalDescriptor.path,
          this.originalDescriptor.session,
          undefined,
          strictProtocol,
          undefined,
          options?.forceProtocolDetection
        );
        this.mainId = acquireResult as string | undefined;
        Log.debug('Expected session id:', this.mainId);
      }
      // Propagate protocol version detected during acquire.
      const detectedProtocol =
        (acquireResult as { protocolType?: HardwareConnectProtocol } | undefined)?.protocolType ??
        TransportManager.transport?.getProtocolType?.(
          DataManager.isBleConnect(env) ? this.originalDescriptor.id : this.originalDescriptor.path
        );
      if (options?.forceProtocolDetection && !detectedProtocol) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Active protocol detection returned no protocol for ${
            this.originalDescriptor.path || this.originalDescriptor.id
          }`
        );
      }
      if (detectedProtocol) {
        this.originalDescriptor.protocolType = detectedProtocol;
      }
      if (this.interruptedAttempt === attempt || this.connectionAttempt !== attempt) {
        const session = this.mainId;
        if (session && this.deviceConnector?.disconnect) {
          await this.deviceConnector.disconnect(session).catch(disconnectError => {
            Log.debug('Ignored disconnect after user cancel during acquire', disconnectError);
          });
        }
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser);
      }
      this.deviceAcquired = true;
      this.updateDescriptor({ [mainIdKey]: this.mainId } as unknown as DeviceDescriptor);

      if (this.commands) {
        await this.commands.dispose(false);
      }

      this.commands = new DeviceCommands(this, this.mainId ?? '');
      // Protocol V2 runtime metadata belongs to one active transport link. A
      // successful acquire creates a fresh link/session, so never carry cached
      // ProtocolInfo or pre-initialize state across that boundary.
      this.invalidateProtocolV2RuntimeState();
    } catch (error) {
      if (options?.forceProtocolDetection) {
        this.originalDescriptor.protocolType = previousProtocol;
        const failedSession = this.mainId;
        this.deviceAcquired = false;
        if (failedSession) {
          try {
            await this.deviceConnector?.release?.(failedSession, false);
          } catch (releaseError) {
            Log.debug('Failed to release an unsuccessful protocol probe', releaseError);
          }
        }
        if (!DataManager.isBleConnect(env)) {
          this.mainId = null;
          this.updateDescriptor({ session: null } as DeviceDescriptor);
        }
      }
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
        // BLE releases even when keepSession is set, so forward the intent.
        await this.deviceConnector?.release(this.mainId, false, this.keepSession);
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
   * Canonical protocol discriminator.
   *
   * descriptor.protocolType is established by active probing; V2 features are mapped
   * from DeviceInfoGet. All protocol branches must use this method instead of reading
   * originalDescriptor.protocolType directly or inferring a protocol from features.
   */
  getProtocol(): 'V1' | 'V2' {
    return this.originalDescriptor.protocolType === 'V2' ? 'V2' : 'V1';
  }

  isProtocolV2() {
    return this.getProtocol() === 'V2';
  }

  getCurrentDeviceType() {
    return this.state?.identity.deviceType ?? EDeviceType.Unknown;
  }

  getCurrentDeviceId() {
    return this.state?.identity.deviceId || undefined;
  }

  getCurrentSerialNo() {
    return this.state?.identity.serialNo ?? '';
  }

  getConnectId() {
    const serialNo = this.getCurrentSerialNo();
    if (serialNo) return serialNo;

    // connectId is an internal routing key. Falling back to the transport descriptor
    // does not change the business meaning of features.serialNo or deviceId.
    return this.originalDescriptor.path || this.originalDescriptor.id || '';
  }

  getCurrentBleName() {
    const bleName = this.state?.identity.bleName ?? null;
    return bleName ? canonicalizePro2BleAdvertisementName(bleName) : null;
  }

  getCurrentLabel() {
    return this.state?.identity.label ?? null;
  }

  getCurrentDisplayName() {
    if (!this.state) return null;

    const label = this.getCurrentLabel();
    if (label) return label;

    const bleName = this.getCurrentBleName();
    if (bleName) return bleName;

    const deviceType = this.getCurrentDeviceType();
    if (deviceType === EDeviceType.ClassicPure) {
      return 'OneKey Classic 1S';
    }

    return `OneKey ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
  }

  getCurrentPassphraseProtection() {
    return this.state?.status.passphraseProtection;
  }

  getCurrentFirmwareType() {
    return this.state?.identity.firmwareType ?? EFirmwareType.Universal;
  }

  getCurrentFirmwareVersionString() {
    return parseDeviceVersion(this.state?.versions.firmware).join('.');
  }

  getCurrentBLEFirmwareVersionString() {
    if (!this.state) return undefined;
    return parseDeviceVersion(this.state.versions.ble).join('.');
  }

  getCurrentBootloaderVersionString() {
    if (!this.state) return undefined;
    return parseDeviceVersion(this.state.versions.bootloader).join('.');
  }

  getCurrentSafetyChecks() {
    return this.state?.settings.safetyChecks;
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
      'model_pro2',
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
      deviceType === EDeviceType.Pro2 ||
      deviceType === EDeviceType.Neo
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
    const deviceType = this.getCurrentDeviceType();
    if (
      deviceType === EDeviceType.Touch ||
      deviceType === EDeviceType.Pro ||
      deviceType === EDeviceType.Pro2 ||
      deviceType === EDeviceType.Neo
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
    // Pro2 has an independent 1.x version line and must not use the Touch/Pro 3.4.0
    // threshold. ApplySettings includes homescreen from the first V2 firmware version.
    if (this.isProtocolV2()) {
      return { support: true };
    }

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
      return this.originalDescriptor.path;
    }
    return undefined;
  }

  private reconcileSessionCacheDeviceIdentity(previousDeviceId?: string) {
    deviceWalletSessionStore.reconcileDeviceIdentity({
      temporaryKey: this.isProtocolV2() ? this.originalDescriptor.path : undefined,
      previousDeviceId,
      nextDeviceId: this.getCurrentDeviceId(),
    });
  }

  getInternalState(_deviceId?: string) {
    Log.debug(
      'getInternalState session param: ',
      `device_id: ${_deviceId}`,
      `currentDeviceId: ${this.getCurrentDeviceId()}`,
      `hasPassphraseState: ${Boolean(this.passphraseState)}`
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

  getStandardInternalState(_deviceId?: string) {
    const deviceId = this.getSessionCacheDeviceKey(_deviceId);
    if (!deviceId) return undefined;
    return deviceWalletSessionStore.getStandard(deviceId);
  }

  // attach to pin to fix internal state
  updateInternalState(
    enablePassphrase: boolean,
    passphraseState: string | undefined,
    deviceId: string | undefined,
    sessionId: string | null = null,
    featuresSessionId: string | null = null,
    walletType: 'standard' | 'hidden' = 'hidden'
  ) {
    Log.debug(
      'updateInternalState session param: ',
      `device_id: ${deviceId}`,
      `enablePassphrase: ${enablePassphrase}`,
      `hasPassphraseState: ${Boolean(passphraseState)}`,
      `hasSessionId: ${Boolean(sessionId)}`,
      `hasFeaturesSessionId: ${Boolean(featuresSessionId)}`
    );

    const cacheDeviceKey = this.getSessionCacheDeviceKey(deviceId);
    if (!cacheDeviceKey) return;

    if (enablePassphrase) {
      const walletSessionId =
        sessionId || featuresSessionId || deviceWalletSessionStore.getPending(cacheDeviceKey);
      if (walletType === 'standard') {
        deviceWalletSessionStore.setStandard(
          cacheDeviceKey,
          passphraseState,
          walletSessionId ?? undefined
        );
      } else {
        deviceWalletSessionStore.set(cacheDeviceKey, passphraseState, walletSessionId ?? undefined);
      }
    }

    deviceWalletSessionStore.deletePending(cacheDeviceKey);
  }

  private setInternalState(state: string, initSession?: boolean) {
    Log.debug(
      'setInternalState session param: ',
      `hasState: ${Boolean(state)}`,
      `initSession: ${initSession}`,
      `deviceId: ${this.getCurrentDeviceId()}`,
      `hasPassphraseState: ${Boolean(this.passphraseState)}`
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

  clearStandardInternalState(_deviceId?: string) {
    const deviceId = this.getSessionCacheDeviceKey(_deviceId);
    if (!deviceId) return;
    deviceWalletSessionStore.deleteStandard(deviceId);
  }

  async initialize(options?: InitOptions) {
    this.throwIfInterruptedByUser();
    // Protocol V2 does not support legacy Initialize; use its dedicated flow.
    if (this.isProtocolV2()) {
      this.passphraseState = options?.passphraseState;
      if (this.state && !options?.initSession && !this.protocolV2StateNeedsReload) {
        if (this.state.status.mode === 'bootloader' || this.state.status.mode === 'romloader') {
          return;
        }
        // Normal calls reuse the cache. Explicit getDeviceState refreshes, unlock flow,
        // and device events update dynamic state without polling on every SDK call.
        return;
      }
      await this._initializeProtocolV2(options);
      this.protocolV2StateNeedsReload = false;
      return;
    }

    try {
      const callInitialize = async (payload: Record<string, unknown>, initSession?: boolean) => {
        const initStartAt = Date.now();
        const { message } = await this.commands.typedCall('Initialize', 'Features', payload, {
          // iOS BLE bound devices can need close to 20 seconds.
          timeoutMs: options?.timeoutMs ?? 25 * 1000,
        });
        this.setLastInitializeDuration(Date.now() - initStartAt);
        this._updateFeatures(message, initSession);
        await TransportManager.reconfigure(this.features);
      };

      const expectedDeviceId = options?.deviceId;

      if (expectedDeviceId && !(this.features && this.checkDeviceId(expectedDeviceId))) {
        // No locally-cached evidence that the device at this path is the
        // expected one (first contact, or the cached features already disagree
        // with the caller). Establish identity with a context-free Initialize
        // BEFORE any wallet context (session_id / passphrase_state) goes on
        // the wire. In normal flows features are always fresh — enumerate /
        // getFeatures run first and every call response refreshes them — so
        // this extra round trip is confined to the ambiguous cases where the
        // disclosure risk actually lives.
        this.passphraseState = undefined;
        await callInitialize({ is_contains_attach: true });
        if (!this.checkDeviceId(expectedDeviceId)) {
          throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
        }
      }

      this.passphraseState = options?.passphraseState;

      if (options?.initSession) {
        this.clearInternalState(options?.deviceId);
      }

      const internalState = this.getInternalState(options?.deviceId);
      const payload: Record<string, unknown> = {
        passphrase_state: options?.passphraseState,
        is_contains_attach: true,
      };
      if (internalState) {
        payload.session_id = internalState;
      }
      if (options?.deriveCardano) {
        payload.derive_cardano = true;
      }

      if (this.features) {
        // Re-sync the V1 message schema for THIS device before encoding
        // Initialize: the process-global schema may still reflect another
        // device (e.g. legacy-firmware Touch/Mini) on multi-device setups, and
        // a stale legacy schema would silently strip passphrase_state /
        // is_contains_attach from the wire message. Local operation, no wire
        // I/O; a no-op when the schema is unchanged.
        await TransportManager.reconfigure(this.features);
      }

      // Initialize's own Features response carries device_id, so the physical
      // device identity is validated on the same round trip instead of via a
      // separate read-only GetFeatures preflight (which doubled the wire cost
      // of every deviceId-carrying call). The method fn has not run yet, so a
      // mismatch still fails before any wallet data can be derived, with the
      // same DeviceCheckDeviceIdError. Wallet-context selection is unchanged:
      // it is decided by the Initialize payload above either way.
      const assertExpectedDeviceIdentity = () => {
        if (expectedDeviceId && !this.checkDeviceId(expectedDeviceId)) {
          // The mismatched Initialize may have cached a session under the wrong
          // device's identity; drop it so no wallet context survives from it.
          // (This also evicts any session the wrong device legitimately cached
          // under the same passphraseState — a deliberate conservative purge
          // after a physical-swap event, consistent with
          // reconcileDeviceIdentity purging the previous device's sessions.)
          this.clearInternalState();
          throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
        }
      };

      try {
        await callInitialize(payload, options?.initSession);
      } catch (error) {
        // callInitialize can fail AFTER the wire call cached the session (e.g.
        // TransportManager.reconfigure rejecting); the identity check must
        // still run so a wrong-device session never survives the error path.
        assertExpectedDeviceIdentity();
        throw error;
      }
      assertExpectedDeviceIdentity();
    } catch (error) {
      Log.error('Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Device initialization over Protocol V2.
   *
   * Protocol V2 bypasses legacy Initialize/GetFeatures and builds its canonical
   * features state directly from DeviceInfoGet.
   */
  private async _initializeProtocolV2(options?: InitOptions) {
    Log.debug('Initialize device via Protocol V2 features adapter');

    try {
      // typedCall applies the request timeout. An outer Promise.race would leak its
      // timer and leave the underlying call active after rejection.
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.commands,
        timeoutMs: options?.protocolV2DeviceInfoTimeoutMs,
      });
      // The default request excludes SE/hash data and therefore uses basic scope.
      // Full version and verification data require getDeviceState({ scope: 'firmware' }).
      await this.probeProtocolV2RuntimeState(deviceInfo, options?.protocolV2DeviceInfoTimeoutMs);
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
      return this.probeProtocolV2RuntimeState(deviceInfo);
    }

    const { message } = await this.commands.typedCall('GetFeatures', 'Features', {});
    this._updateFeatures(message);
    return this.features;
  }

  async getDeviceState(params: DeviceStateReadOptions = {}) {
    const refresh = new Set(params.refreshSections ?? []);
    const getProtocolV2DeviceInfoRequest = () => {
      if (refresh.has('verification')) return PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST;
      if (refresh.has('versions')) return PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST;
      return PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST;
    };
    let initializedWithDeviceInfo = false;
    let refreshedDeviceInfo: ProtocolV2DeviceInfo | undefined;

    if (!this.state) {
      if (this.isProtocolV2()) {
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.commands,
          request: getProtocolV2DeviceInfoRequest(),
        });
        await this.probeProtocolV2RuntimeState(deviceInfo);
        refreshedDeviceInfo = deviceInfo;
        initializedWithDeviceInfo = true;
      } else {
        await this.getFeatures();
      }
    } else if (!this.isProtocolV2() && refresh.size > 0) {
      await this.getFeatures();
    }

    const supportsProtocolV1OnekeyFeatures =
      this.getCurrentDeviceType() === EDeviceType.Touch ||
      this.getCurrentDeviceType() === EDeviceType.Pro;
    if (!this.isProtocolV2() && refresh.has('verification') && supportsProtocolV1OnekeyFeatures) {
      const { message } = await this.commands.typedCall('OnekeyGetFeatures', 'OnekeyFeatures');
      this.updateState(mapProtocolV1OnekeyFeaturesToState(message), 'device-info');
    }

    if (this.isProtocolV2()) {
      const refreshDeviceInfo =
        refresh.has('identity') || refresh.has('versions') || refresh.has('verification');
      if (refreshDeviceInfo && !initializedWithDeviceInfo) {
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.commands,
          request: getProtocolV2DeviceInfoRequest(),
        });
        refreshedDeviceInfo = deviceInfo;
        if (!refresh.has('status')) {
          this.updateState(
            mapProtocolV2DeviceInfoToState(deviceInfo, this.state?.status.mode),
            'device-info'
          );
        }
      }

      if (refresh.has('status') && !initializedWithDeviceInfo) {
        const cachedMode = this.state?.status.mode;
        await this.probeProtocolV2RuntimeState(refreshedDeviceInfo, undefined, {
          // Loader firmware does not support DeviceStatusGet. Renegotiate ProtocolInfo
          // during an explicit refresh so a device rebooted into application firmware
          // can leave the cached loader state.
          forceRuntimeContextRefresh: cachedMode === 'bootloader' || cachedMode === 'romloader',
        });
      }

      if (refresh.has('settings') && this.state?.status.mode === 'normal') {
        const { message } = await this.commands.typedCall(
          'DeviceSettingsGet',
          'DeviceSettings',
          {}
        );
        this.updateState(mapDeviceSettingsToState(message), 'settings-read');
      }
    }

    if (!this.state) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
    }
    return params.includeRaw ? cloneDeviceState(this.state) : createPublicDeviceState(this.state);
  }

  async refreshProtocolV2SettingsAfterMutation() {
    return this.getDeviceState({ refreshSections: ['status', 'settings'] });
  }

  _updateFeatures(protoFeatures: PROTO.Features | Features, initSession?: boolean) {
    const previousDeviceId = this.getCurrentDeviceId();
    let feat =
      'protocol' in protoFeatures
        ? protoFeatures
        : buildProtocolV1FeaturesPayload(protoFeatures, this.features);

    feat.unlocked = feat.unlocked ?? true;

    feat = fixFeaturesFirmwareVersion(feat);

    this.updateState(mapFeaturesToState(feat), 'initialize');
    this.reconcileSessionCacheDeviceIdentity(previousDeviceId);
    if (feat.deviceId && feat.sessionId) {
      this.setInternalState(feat.sessionId, initSession);
    }
  }

  updateState(patch: DeviceStatePatch, source: DeviceStateUpdateSource) {
    const result = this.stateStore.update(patch, source);
    if (result.changedKeys.length === 0) return result.state;

    const event: DeviceStateEvent = {
      connectId: this.getConnectId() ?? null,
      state: createPublicDeviceState(result.state),
      revision: result.revision,
      source,
      changedKeys: result.changedKeys,
    };
    Log.debug('Device state updated', {
      source,
      revision: result.revision,
      changedKeyCount: result.changedKeys.length,
    });
    this.emit(DEVICE.STATE, this, event);
    if (result.state.protocol === 'V1') {
      this.emit(DEVICE.FEATURES, this, projectFeatures(result.state));
    }
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

  async ensureProtocolV2RuntimeContext(
    timeoutMs?: number,
    options?: { forceRefresh?: boolean }
  ): Promise<ProtocolInfo> {
    const cachedProtocolInfo =
      options?.forceRefresh === true
        ? undefined
        : this.protocolV2RuntimeContext ??
          (!this.protocolV2StateNeedsReload
            ? this.state?.raw?.protocolV2ProtocolInfo ?? undefined
            : undefined);
    if (cachedProtocolInfo) {
      this.protocolV2RuntimeContext = cachedProtocolInfo;
      return cachedProtocolInfo;
    }

    if (this.protocolV2RuntimeContextPromise) {
      return this.protocolV2RuntimeContextPromise;
    }

    const requestToken = {};
    const pendingRequest = (async () => {
      const protocolInfo = await requestProtocolV2ProtocolInfo({
        commands: this.commands,
        timeoutMs,
      });
      if (this.protocolV2RuntimeContextRequestToken !== requestToken) {
        throw ERRORS.TypedError(
          HardwareErrorCode.DeviceInitializeFailed,
          'Protocol V2 runtime context was invalidated while loading.'
        );
      }
      this.protocolV2RuntimeContext = protocolInfo;
      return protocolInfo;
    })();
    this.protocolV2RuntimeContextRequestToken = requestToken;
    this.protocolV2RuntimeContextPromise = pendingRequest;

    try {
      return await pendingRequest;
    } finally {
      if (this.protocolV2RuntimeContextPromise === pendingRequest) {
        this.protocolV2RuntimeContextPromise = undefined;
      }
      if (this.protocolV2RuntimeContextRequestToken === requestToken) {
        this.protocolV2RuntimeContextRequestToken = undefined;
      }
    }
  }

  async probeProtocolV2RuntimeState(
    deviceInfo?: ProtocolV2DeviceInfo,
    timeoutMs?: number,
    options?: {
      forceRuntimeContextRefresh?: boolean;
    }
  ) {
    const protocolInfo = await this.ensureProtocolV2RuntimeContext(timeoutMs, {
      forceRefresh: options?.forceRuntimeContextRefresh,
    });
    const runtimeDeviceInfo = deviceInfo ?? this.state?.raw?.protocolV2DeviceInfo;
    const runtimeMode = getProtocolV2RuntimeMode(protocolInfo, runtimeDeviceInfo);
    const legacyProtocolInfo = isLegacyProtocolV2ProtocolInfo(protocolInfo);
    const protocolV2DeviceType = runtimeDeviceInfo
      ? resolveProtocolV2DeviceIdentity(runtimeDeviceInfo.hw?.Device_type).deviceType
      : this.getCurrentDeviceType();
    if (
      runtimeMode === 'romloader' &&
      protocolV2DeviceType !== EDeviceType.Pro2 &&
      protocolV2DeviceType !== EDeviceType.Neo
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.DeviceInitializeFailed,
        'Protocol V2 romloader mode is only supported for Pro2 and Neo.'
      );
    }
    const deviceStatusSupported =
      legacyProtocolInfo ||
      supportsProtocolV2Message(protocolInfo, PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE);

    if (runtimeMode === 'bootloader' || runtimeMode === 'romloader') {
      return this.updateProtocolV2Features(deviceInfo, null, runtimeMode, protocolInfo);
    }

    if (!deviceStatusSupported) {
      if (runtimeMode === 'normal') {
        return this.updateProtocolV2Features(deviceInfo, null, runtimeMode, protocolInfo);
      }
      throw ERRORS.TypedError(
        HardwareErrorCode.DeviceInitializeFailed,
        `Unknown Protocol V2 build fingerprint without DeviceStatusGet capability: ${protocolInfo.build_fingerprint}`
      );
    }

    let deviceStatus: DeviceStatus;
    try {
      deviceStatus = await requestProtocolV2DeviceStatus({
        commands: this.commands,
        timeoutMs,
      });
    } catch (error) {
      if (runtimeMode === undefined && isProtocolV2DeviceStatusUnsupportedError(error)) {
        return this.updateProtocolV2Features(deviceInfo, null, 'bootloader', protocolInfo);
      }
      throw error;
    }
    return this.updateProtocolV2Features(deviceInfo, deviceStatus, 'normal', protocolInfo);
  }

  updateProtocolV2Features(
    deviceInfo?: ProtocolV2DeviceInfo,
    deviceStatus?: DeviceStatus | null,
    runtimeMode?: ProtocolV2RuntimeMode,
    protocolInfo?: ProtocolInfo
  ) {
    const previousDeviceId = this.getCurrentDeviceId();
    const resolvedMode = runtimeMode ?? (deviceStatus ? 'normal' : this.state?.status.mode);
    if (deviceInfo) {
      this.updateState(mapProtocolV2DeviceInfoToState(deviceInfo, resolvedMode), 'device-info');
    }
    if (protocolInfo) {
      this.updateState({ raw: { protocolV2ProtocolInfo: protocolInfo } }, 'device-info');
    }
    if (deviceStatus) {
      this.updateState(mapProtocolV2DeviceStatusToState(deviceStatus), 'device-status');
    }
    this.reconcileSessionCacheDeviceIdentity(previousDeviceId);
    return this.features as Features;
  }

  updateProtocolV2Status(status: DeviceStatus) {
    const previousDeviceInfo = this.state?.raw?.protocolV2DeviceInfo;
    const previousStatus = this.state?.raw?.protocolV2DeviceStatus;
    return this.updateProtocolV2Features(previousDeviceInfo, {
      ...previousStatus,
      ...status,
    });
  }

  private invalidateProtocolV2RuntimeState() {
    if (!this.isProtocolV2()) return;
    this.protocolV2StateNeedsReload = true;
    this.protocolV2RuntimeContext = undefined;
    this.protocolV2RuntimeContextPromise = undefined;
    this.protocolV2RuntimeContextRequestToken = undefined;
    this.clearPreInitialized();
  }

  markTransportDisconnected() {
    this.deviceAcquired = false;
    this.invalidateProtocolV2RuntimeState();
  }

  invalidateAfterWipe() {
    const deviceId = this.getCurrentDeviceId();
    if (deviceId) {
      deviceWalletSessionStore.deleteDevice(deviceId);
    }
    if (this.isProtocolV2()) {
      if (this.originalDescriptor.path !== deviceId) {
        deviceWalletSessionStore.deleteDevice(this.originalDescriptor.path);
      }
      this.invalidateProtocolV2RuntimeState();
    }

    this.passphraseState = undefined;
    this.stateStore = new DeviceStateStore();
    this.clearPreInitialized();
    this.needReloadDevice = true;
  }

  markProtocolV2Reboot(rebootType: DeviceRebootType) {
    if (!this.isProtocolV2()) return;

    this.invalidateProtocolV2RuntimeState();
    let loaderMode: 'bootloader' | 'romloader' | undefined;
    if (rebootType === DeviceRebootType.Bootloader) {
      loaderMode = 'bootloader';
    } else if (rebootType === DeviceRebootType.Romloader) {
      loaderMode = 'romloader';
    }
    if (loaderMode) {
      this.updateState(
        {
          identity: { deviceId: null },
          status: {
            mode: loaderMode,
            initialized: null,
            unlocked: null,
            firmwarePresent: null,
            backupRequired: null,
            noBackup: null,
            unfinishedBackup: null,
            recoveryMode: null,
            passphraseProtection: null,
            pinProtection: null,
            attachToPinEnabled: null,
            unlockedAttachPin: null,
          },
          raw: { protocolV2ProtocolInfo: null, protocolV2DeviceStatus: null },
        },
        'transport-reconnect'
      );
      return;
    }

    this.updateState(
      {
        status: { mode: 'normal', unlocked: null },
        raw: { protocolV2ProtocolInfo: null, protocolV2DeviceStatus: null },
      },
      'transport-reconnect'
    );
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
      // Enumerated descriptors may omit protocolType, so preserve an actively probed value.
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
    // Adopting another Device instance's command channel also crosses an active
    // link boundary. Renegotiate runtime metadata on that channel instead of
    // retaining ProtocolInfo from the previous instance/session.
    this.invalidateProtocolV2RuntimeState();
  }

  waitForRunCleanup(): Promise<void> {
    return this.runCleanupPromise ?? Promise.resolve();
  }

  async run(fn?: () => Promise<void>, options?: RunOptions) {
    if (this.runPromise) {
      await this.interruptionFromOutside();
      Log.debug('[Device] run error:', 'Device is running, but will cancel previous operate');
    }

    this.beginConnectionAttempt();
    options = parseRunOptions(options);

    const runPromise = createDeferred<void>();
    this.runPromise = runPromise;
    const cleanupPromise = this._runInner(fn, options, runPromise).catch(error => {
      if (this.runPromise === runPromise) {
        this.runPromise = null;
      }
      runPromise.reject(error);
    });
    this.runCleanupPromise = cleanupPromise;
    cleanupPromise
      .finally(() => {
        if (this.runCleanupPromise === cleanupPromise) {
          this.runCleanupPromise = undefined;
        }
      })
      .catch(() => undefined);
    return runPromise.promise;
  }

  async _runInner<T>(
    fn: (() => Promise<T>) | undefined,
    options: RunOptions,
    runPromise: Deferred<void>
  ) {
    const clearRunPromise = () => {
      if (this.runPromise === runPromise) {
        this.runPromise = null;
      }
    };

    const env = DataManager.getSettings('env');
    if (options.forceProtocolDetection && env !== 'react-native' && this.isUsedHere()) {
      await this.release();
    }

    if (options.forceProtocolDetection || !this.isUsedHere() || this.commands.disposed) {
      if (env !== 'react-native') {
        try {
          await this.acquire(options.connectProtocol, {
            forceProtocolDetection: options.forceProtocolDetection,
          });
        } catch (error) {
          clearRunPromise();
          runPromise.reject(error);
          return;
        }

        try {
          if (fn) {
            if (!options?.skipInitialize) {
              await this.initialize(options);
            }
          }
        } catch (error) {
          await this.release();
          clearRunPromise();
          if (error instanceof HardwareError) {
            runPromise.reject(error);
            return;
          }
          runPromise.reject(
            ERRORS.TypedError(
              HardwareErrorCode.DeviceInitializeFailed,
              `Initialize failed: ${error.message as string}, code: ${error.code as string}`
            )
          );
          return;
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
        runPromise.reject(e);

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

        clearRunPromise();
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

    runPromise.resolve();
    clearRunPromise();
  }

  async interruptionFromOutside() {
    if (this.commands) {
      await this.commands.dispose(false);
    }
    if (this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromOutside));
    }
  }

  interruptionFromUser(): Promise<void> {
    const attempt = this.connectionAttempt;
    if (this.userInterruption?.attempt === attempt) {
      return this.userInterruption.promise;
    }
    const error = ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser);
    this.interruptedAttempt = attempt;
    const cleanupPromise = this.runCleanupPromise;
    const { cancelableAction, commands, runPromise, deviceConnector, mainId } = this;
    const sendFallbackCancel = this.shouldSendFallbackProtocolCancel();
    const acquired = this.hasDeviceAcquire();
    const promise = (async () => {
      if (cancelableAction) {
        await cancelableAction(error);
      } else if (sendFallbackCancel) {
        await commands?.cancelDevice?.().catch(cancelError => {
          Log.debug('Protocol V2 fallback cancel error', cancelError);
        });
      } else if (!acquired) {
        // Abort setup without acquiring a session just to send Cancel.
        if (mainId && deviceConnector?.disconnect) {
          await deviceConnector.disconnect(mainId);
        }
        if (this.connectionAttempt === attempt) this.markTransportDisconnected();
      }
      await commands?.cancel();
      runPromise?.reject(error);
      if (this.runPromise === runPromise) this.runPromise = null;
      await cleanupPromise?.catch(() => undefined);
    })();
    // Keep the settled promise for this attempt so a duplicate close/finally
    // cannot send a second wire Cancel. A new attempt gets its own cleanup.
    this.userInterruption = { attempt, promise };
    return promise;
  }

  setCancelableAction(callback: (err?: Error) => Promise<unknown>) {
    const action = (e?: Error) =>
      callback(e)
        .catch(e2 => {
          Log.debug('cancelableAction error', e2);
        })
        .finally(() => {
          if (this.cancelableAction === action) this.clearCancelableAction();
        });
    this.cancelableAction = action;
  }

  clearCancelableAction() {
    this.cancelableAction = undefined;
  }

  getMode() {
    switch (this.state?.status.mode) {
      case 'bootloader':
      case 'romloader':
        return EOneKeyDeviceMode.bootloader;
      case 'notInitialized':
        return EOneKeyDeviceMode.notInitialized;
      case 'backupMode':
        return EOneKeyDeviceMode.backupMode;
      case 'normal':
        return EOneKeyDeviceMode.normal;
      default:
        break;
    }

    return EOneKeyDeviceMode.normal;
  }

  getStatus() {
    if (this.isUsedElsewhere()) return 'occupied' as const;
    if (this.isUsedHere()) return 'used' as const;
    return 'available' as const;
  }

  getFirmwareVersion() {
    if (!this.state) return null;
    return parseDeviceVersion(this.state.versions.firmware);
  }

  getBLEFirmwareVersion() {
    if (!this.state) return null;
    return parseDeviceVersion(this.state.versions.ble);
  }

  isUsed() {
    return typeof this.originalDescriptor.session === 'string';
  }

  beginConnectionAttempt() {
    this.connectionAttempt += 1;
    return this.connectionAttempt;
  }

  wasInterruptedByUser() {
    return (
      typeof this.interruptedAttempt === 'number' &&
      this.interruptedAttempt === this.connectionAttempt
    );
  }

  private throwIfInterruptedByUser() {
    if (this.wasInterruptedByUser()) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser);
    }
  }

  /**
   * Protocol Cancel is only for an acquired session that is already in a
   * user-facing prompt. Connect, probe and initialize must not send Cancel
   * and must not re-acquire just to deliver one.
   */
  private shouldSendFallbackProtocolCancel() {
    if (!this.hasDeviceAcquire() || !this.isProtocolV2()) {
      return false;
    }
    if (!this.hasOpenProtocolV2UiInteraction()) {
      return false;
    }
    const env = DataManager.getSettings('env');
    return (
      DataManager.isBleConnect(env) ||
      DataManager.isBrowserWebUsb(env) ||
      DataManager.isDesktopWebUsb(env)
    );
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
      return this.deviceAcquired;
    }
    return this.isUsed() && this.originalDescriptor.session === this.mainId;
  }

  isUsedElsewhere(): boolean {
    return this.isUsed() && !this.isUsedHere();
  }

  isBootloader() {
    if (!this.state) return undefined;
    return this.state.status.mode === 'bootloader';
  }

  isRomloader() {
    if (!this.state) return undefined;
    return (
      this.isProtocolV2() &&
      (this.getCurrentDeviceType() === EDeviceType.Pro2 ||
        this.getCurrentDeviceType() === EDeviceType.Neo) &&
      this.state.status.mode === 'romloader'
    );
  }

  isInitialized() {
    if (!this.state) return undefined;
    return this.state.status.initialized === true;
  }

  isSeedless() {
    if (!this.state) return undefined;
    return this.state.status.noBackup === true;
  }

  isUnacquired(): boolean {
    return this.state === undefined;
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
      deviceType === EDeviceType.Pro2 ||
      deviceType === EDeviceType.Neo;
    const unlocked = this.state?.status.unlocked;
    const preCheckTouch = isModeT && unlocked === false;
    const passphraseProtection = this.getCurrentPassphraseProtection();

    return Boolean(passphraseProtection === true || preCheckTouch);
  }

  checkDeviceId(deviceId: string) {
    return this.getCurrentDeviceId() === deviceId;
  }

  async lockDevice(): Promise<Success> {
    const res = await this.commands.typedCall('LockDevice', 'Success', {});
    this.updateState({ status: { unlocked: false } }, 'lock');
    return res.message;
  }

  beginProtocolV2UiInteraction() {
    if (!this.isProtocolV2()) return;
    this.protocolV2UiInteraction = {
      interactionId: `${this.instanceId}:${Date.now()}:${++this.protocolV2UiInteractionCounter}`,
      phaseCounter: 0,
      sequence: 0,
      opened: false,
    };
  }

  createProtocolV2UiPhaseMetadata(
    phase: HardwareUiInteractionMeta['phase'],
    transition: HardwareUiInteractionMeta['transition'],
    options?: {
      phaseId?: string;
      outcome?: HardwareUiInteractionMeta['outcome'];
    }
  ): HardwareUiInteractionMeta | undefined {
    if (!this.isProtocolV2()) return undefined;
    if (!this.protocolV2UiInteraction) this.beginProtocolV2UiInteraction();

    const interaction = this.protocolV2UiInteraction;
    if (!interaction) return undefined;
    const phaseId =
      options?.phaseId ?? `${interaction.interactionId}:phase-${++interaction.phaseCounter}`;
    interaction.opened = true;
    interaction.sequence += 1;

    return {
      interactionId: interaction.interactionId,
      phaseId,
      sequence: interaction.sequence,
      phase,
      transition,
      ...(options?.outcome ? { outcome: options.outcome } : {}),
      protocol: 'V2',
    };
  }

  completeProtocolV2UiPhase(
    phase: HardwareUiInteractionMeta,
    outcome: HardwareUiInteractionMeta['outcome'] = 'succeeded'
  ) {
    return this.createProtocolV2UiPhaseMetadata(phase.phase, 'complete', {
      phaseId: phase.phaseId,
      outcome,
    });
  }

  finishProtocolV2UiInteraction(
    outcome?: HardwareUiInteractionMeta['outcome'],
    options?: { ensureMetadata?: boolean }
  ) {
    const interaction = this.protocolV2UiInteraction;
    if (!interaction || (!interaction.opened && !options?.ensureMetadata)) {
      this.protocolV2UiInteraction = undefined;
      return undefined;
    }

    const phaseId = `${interaction.interactionId}:phase-${Math.max(interaction.phaseCounter, 1)}`;
    interaction.opened = true;
    interaction.sequence += 1;
    const metadata: HardwareUiInteractionMeta = {
      interactionId: interaction.interactionId,
      phaseId,
      sequence: interaction.sequence,
      phase: 'processing',
      transition: 'finish',
      outcome: outcome ?? 'succeeded',
      protocol: 'V2',
    };
    this.protocolV2UiInteraction = undefined;
    return metadata;
  }

  hasOpenProtocolV2UiInteraction() {
    return this.protocolV2UiInteraction?.opened === true;
  }

  supportUnlockVersionRange(): DeviceFirmwareRange {
    // This range applies to Protocol V1 Pro devices; Pro2 has a dedicated unlock flow.
    return {
      pro: {
        min: '4.15.0',
      },
    };
  }

  async unlockDevice(
    pinType?: DeviceSessionPinType,
    options?: ProtocolV2UiEventMetadata & { emitUiEvent?: boolean }
  ) {
    if (this.isProtocolV2()) {
      const requestedPinType = pinType ?? DeviceSessionPinType.Main;
      const interaction =
        options?.interaction ??
        (options?.emitUiEvent === false
          ? undefined
          : this.createProtocolV2UiPhaseMetadata('pin', 'start'));
      if (options?.emitUiEvent !== false) {
        this.emit(DEVICE.PIN_ON_DEVICE, this, requestedPinType, {
          source: options?.source ?? 'unlock-coordinator',
          reason: options?.reason ?? 'device-unlock',
          deviceOnly: options?.deviceOnly ?? true,
          completion: options?.completion,
          method: options?.method,
          page: options?.page,
          operation: options?.operation,
          interaction: options?.interaction ?? interaction,
        });
      }
      try {
        await this.commands.typedCall('DeviceSessionAskPin', 'Success', {
          type: requestedPinType,
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

      const completion = interaction ? this.completeProtocolV2UiPhase(interaction) : undefined;
      if (completion) {
        this.emit(DEVICE.PIN_ON_DEVICE_COMPLETE, this, completion);
      }

      const status = await requestProtocolV2DeviceStatus({ commands: this.commands });
      return this.updateProtocolV2Status(status);
    }

    const firmwareVersion = this.getCurrentFirmwareVersionString() ?? '0.0.0';
    const versionRange = this.getCurrentMethodVersionRange(
      type => this.supportUnlockVersionRange()[type]
    );

    const supportAttachPinCapability = this.state?.capabilities.includes(
      Enum_Capability.Capability_AttachToPin
    );
    const supportUnlock =
      supportAttachPinCapability ||
      (versionRange &&
        semver.valid(firmwareVersion) &&
        semver.gte(firmwareVersion, versionRange.min));

    if (supportUnlock) {
      const res = await this.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
      if (this.state) {
        this.updateState(
          {
            status: {
              unlocked: res.message.unlocked == null ? null : res.message.unlocked,
              unlockedAttachPin:
                res.message.unlocked_attach_pin == null ? null : res.message.unlocked_attach_pin,
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
    skipPassphraseCheck?: boolean,
    deriveCardano?: boolean,
    mainPinSelected?: boolean
  ) {
    if (this.isUnacquired()) return false;

    const expectedPassphraseState = useEmptyPassphrase ? undefined : passphraseState;
    const { passphraseState: newPassphraseState, unlockedAttachPin } =
      await getPassphraseStateWithRefreshDeviceInfo(this, {
        expectPassphraseState: expectedPassphraseState,
        onlyMainPin: useEmptyPassphrase,
        deriveCardano,
        rejectAttachPinForMainWallet: useEmptyPassphrase === true,
        mainPinSelected,
      });

    // Main wallet and unlock Attach Pin, throw safe error
    const mainWalletUseAttachPin = unlockedAttachPin && useEmptyPassphrase;
    const useErrorAttachPin =
      unlockedAttachPin &&
      expectedPassphraseState &&
      expectedPassphraseState !== newPassphraseState;
    const passphraseStateMismatch =
      !!expectedPassphraseState && expectedPassphraseState !== newPassphraseState;

    Log.debug('Check passphrase state safety: ', {
      hasExpectedPassphraseState: Boolean(expectedPassphraseState),
      hasNewPassphraseState: Boolean(newPassphraseState),
      passphraseStateMatches:
        Boolean(expectedPassphraseState) && expectedPassphraseState === newPassphraseState,
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
