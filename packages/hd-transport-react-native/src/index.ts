import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
import {
  BleError,
  BleErrorCode,
  BleManager as BlePlxManager,
  ConnectionPriority,
  ScanMode,
} from 'react-native-ble-plx';
import ByteBuffer from 'bytebuffer';
import transport, {
  type OneKeyDeviceInfoBase,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  type ProtocolType,
  type ProtocolV2CallContext,
  ProtocolV2FrameAssembler,
  ProtocolV2LinkManager,
  TRANSPORT_EVENT,
  type TransportCallOptions,
  isProtocolV2HighThroughputCall,
  probeProtocolV2 as probeProtocolV2Helper,
  writeProtocolV2BleFrame,
} from '@onekeyfe/hd-transport';
import {
  ERRORS,
  HardwareErrorCode,
  createDeferred,
  isOnekeyBluetoothDevice,
} from '@onekeyfe/hd-shared';

import { getConnectedDeviceIds, onDeviceBondState, pairDevice } from './BleManager';
import {
  hasWritableCapability,
  resolveProtocolV2PacketCapacity,
  shouldRefreshNegotiatedMtu,
  shouldWriteProtocolV2WithResponse,
} from './bleStrategy';
import { subscribeBleOn } from './subscribeBleOn';
import {
  ANDROID_PACKET_LENGTH,
  ANDROID_PROTOCOL_V2_PACKET_LENGTH,
  IOS_PACKET_LENGTH,
  IOS_PROTOCOL_V2_PACKET_LENGTH,
  getBluetoothServiceUuids,
  getInfosForServiceUuid,
  isSameBleUuid,
} from './constants';
import {
  isBleStaleBondHardwareError,
  isNativeBleStaleBondError,
  toBleStaleBondHardwareError,
} from './bleStaleBond';
import { isHeaderChunk } from './utils/validateNotify';
import BleTransport from './BleTransport';
import timer from './utils/timer';
import { bleLogger, setBleLogger } from './logger';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';
import type EventEmitter from 'events';
import type { BleAcquireInput, TransportOptions } from './types';

type FirmwareInstallBleAcquireInput = BleAcquireInput & {
  /**
   * Reuse the already-verified protocol after an expected firmware-install
   * disconnect. The install loader accepts status requests but may not answer
   * the generic protocol probe used by a normal acquire.
   */
  skipProtocolProbe?: boolean;
};

const { check, ProtocolV1, parseConfigure } = transport;

const Log = bleLogger;

const transportCache: Record<string, BleTransport> = {};
const FIRMWARE_UPLOAD_WRITE_BURST_SIZE = Platform.OS === 'ios' ? 4 : 5;
const FIRMWARE_UPLOAD_WRITE_PAUSE_MS = Platform.OS === 'ios' ? 8 : 10;
const FIRMWARE_UPLOAD_WRITE_FLUSH_DELAY_MS = Platform.OS === 'ios' ? 24 : 30;
const FIRMWARE_UPLOAD_WRITE_MAX_RETRIES = 8;
const ANDROID_FIRMWARE_UPLOAD_PACKET_LENGTH = 192;
const FIRMWARE_UPLOAD_WRITE_PACKET_CAPACITY =
  Platform.OS === 'ios' ? IOS_PACKET_LENGTH : ANDROID_FIRMWARE_UPLOAD_PACKET_LENGTH;
const ANDROID_GATT_CONGESTED_STATUS = 143;

type FirmwareUploadWriteRetryType = 'congested';
type ResolvedBleCharacteristics = {
  writeCharacteristic: Characteristic;
  notifyCharacteristic: Characteristic;
};

const isAsciiWhitespace = (code: number) =>
  code === 0x09 ||
  code === 0x0a ||
  code === 0x0b ||
  code === 0x0c ||
  code === 0x0d ||
  code === 0x20;

const hasGattCongestedStatus = (text: string) => {
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const statusIndex = text.indexOf('status', searchFrom);
    if (statusIndex < 0) return false;

    let cursor = statusIndex + 'status'.length;
    while (cursor < text.length && isAsciiWhitespace(text.charCodeAt(cursor))) cursor += 1;
    if (text[cursor] === ':' || text[cursor] === '=') {
      cursor += 1;
      while (cursor < text.length && isAsciiWhitespace(text.charCodeAt(cursor))) cursor += 1;
    }
    if (text.startsWith(String(ANDROID_GATT_CONGESTED_STATUS), cursor)) return true;

    searchFrom = statusIndex + 'status'.length;
  }
  return false;
};

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

export const getFirmwareUploadWriteRetryType = (
  error: unknown
): FirmwareUploadWriteRetryType | null => {
  if (!error || typeof error !== 'object') return null;
  const bleWriteError = error as {
    androidErrorCode?: unknown;
    status?: unknown;
    errorCode?: unknown;
    reason?: unknown;
    message?: unknown;
    name?: unknown;
  };

  if (
    bleWriteError.androidErrorCode === ANDROID_GATT_CONGESTED_STATUS ||
    bleWriteError.status === ANDROID_GATT_CONGESTED_STATUS
  ) {
    return 'congested';
  }

  const text = [bleWriteError.reason, bleWriteError.message, bleWriteError.name]
    .filter(value => typeof value === 'string')
    .join(' ');
  return text.includes('GATT_CONGESTED') || hasGattCongestedStatus(text) ? 'congested' : null;
};

const resolveFirmwareUploadRetryDelay = (attempt: number, baseDelayMs = 200, maxDelayMs = 1200) =>
  Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
const PROTOCOL_PROBE_TIMEOUT_MS = 3000;
const PROTOCOL_V2_PROBE_TIMEOUT_MS = 10_000;
/**
 * Per-packet write budget. iOS only resolves writeWithoutResponse once CoreBluetooth
 * reports the peripheral ready again; a peripheral wedged by its own firmware reboot
 * stops reporting ready while staying connected, so the write promise never settles.
 * Response timeouts cannot cover that — they are armed after the writes complete —
 * and an unbounded write leaves the whole transport unusable until the process dies.
 * A healthy packet completes in milliseconds, so this only fires on a dead link.
 */
export const BLE_WRITE_PACKET_TIMEOUT_MS = 10_000;
export const BLE_NATIVE_TEARDOWN_TIMEOUT_MS = 3_000;
const WEDGED_WRITE_MESSAGE = 'BLE write timeout after';
const isWedgedWriteError = (error: unknown): boolean =>
  (error as { errorCode?: unknown })?.errorCode === HardwareErrorCode.BleWriteCharacteristicError &&
  typeof (error as { message?: unknown })?.message === 'string' &&
  (error as { message: string }).message.startsWith(WEDGED_WRITE_MESSAGE);
/** Consecutive wedged writes on one device before the BLE manager itself is recreated. */
export const BLE_WRITE_TIMEOUT_MANAGER_RESET_THRESHOLD = 2;
const DEVICE_SCAN_TIMEOUT_MS = 3000;
const IOS_NOTIFY_READY_DELAY_MS = 150;
const ANDROID_NOTIFY_READY_DELAY_MS = 300;
export type ProtocolV2BleTuning = {
  iosPacketLength?: number;
  androidPacketLength?: number;
};

type ResolvedProtocolV2BleTuning = Required<ProtocolV2BleTuning>;

const DEFAULT_PROTOCOL_V2_BLE_TUNING: ResolvedProtocolV2BleTuning = {
  iosPacketLength: IOS_PROTOCOL_V2_PACKET_LENGTH,
  androidPacketLength: ANDROID_PROTOCOL_V2_PACKET_LENGTH,
};

let protocolV2BleTuning: ResolvedProtocolV2BleTuning = { ...DEFAULT_PROTOCOL_V2_BLE_TUNING };

const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) return fallback;
  return Math.floor(normalized);
};

export function configureProtocolV2BleTuning(tuning: ProtocolV2BleTuning = {}) {
  protocolV2BleTuning = {
    iosPacketLength: normalizePositiveInteger(
      tuning.iosPacketLength,
      protocolV2BleTuning.iosPacketLength
    ),
    androidPacketLength: normalizePositiveInteger(
      tuning.androidPacketLength,
      protocolV2BleTuning.androidPacketLength
    ),
  };
  Log?.debug('[ReactNativeBleTransport] BLE tuning configured', protocolV2BleTuning);
}

export function resetProtocolV2BleTuning() {
  protocolV2BleTuning = { ...DEFAULT_PROTOCOL_V2_BLE_TUNING };
  Log?.debug('[ReactNativeBleTransport] BLE tuning reset', protocolV2BleTuning);
}

export function getProtocolV2BleTuning() {
  return { ...protocolV2BleTuning };
}

function getDeviceDisplayName(device?: Device | null) {
  return device?.name || device?.localName || null;
}

const IOS_REQUEST_MTU = 247;
const ANDROID_REQUEST_MTU = 517;
const BLE_MTU_REFRESH_RETRY_DELAY_MS = 200;
const ANDROID_HIGH_PRIORITY_IDLE_MS = 1000;

const getRequestedBleMtu = () =>
  Platform.OS === 'android' ? ANDROID_REQUEST_MTU : IOS_REQUEST_MTU;

const BLE_NATIVE_CONNECT_TIMEOUT_MS = 3000;

const connectOptions: Record<string, unknown> = {
  requestMTU: getRequestedBleMtu(),
  timeout: BLE_NATIVE_CONNECT_TIMEOUT_MS,
  refreshGatt: 'OnConnected',
};

/** Fallback connect options: drops requestMTU (the thing being worked around) but keeps the native budget. */
const fallbackConnectOptions: Record<string, unknown> = {
  timeout: BLE_NATIVE_CONNECT_TIMEOUT_MS,
};

/**
 * JS backstop for connect. The native adapter applies its own 3s budget, but it
 * schedules that timeout on its serial queue, so a busy queue (e.g. right after a
 * firmware install tears the link down) can leave the promise unsettled — observed
 * blocking a reconnect for 61s until the app-level timeout. Healthy connects finish
 * inside the native budget, so this only fires when the native timeout did not.
 */
export const BLE_CONNECT_TIMEOUT_MS = BLE_NATIVE_CONNECT_TIMEOUT_MS * 2 + 2000;
/**
 * Service discovery and characteristic resolution run after connect() succeeds, but
 * CoreBluetooth schedules them on the same serial queue. If that queue is wedged by a
 * device reboot, these calls can remain pending forever unless they have their own
 * budget.
 */
export const BLE_GATT_SETUP_TIMEOUT_MS = 10_000;
/**
 * How many times a known device may fail its own protocol before we probe the others
 * again. Reconnect polling during a device reboot repeats this every few seconds, and
 * probing Protocol V2 costs a 10s Ping timeout, so paying it on every attempt for a
 * device we just spoke V1 to dominates the wait. A firmware update can legitimately
 * change a device's protocol, so the shortcut has to expire rather than stick.
 */
export const PROTOCOL_REPROBE_FALLBACK_ATTEMPTS = 3;
/** BLE setup timeouts since the last successful setup before the manager is recreated. */
export const BLE_CONNECT_TIMEOUT_MANAGER_RESET_THRESHOLD = 2;
const CONNECT_TIMEOUT_MESSAGE = 'BLE connect timeout after';
export const BLE_SETUP_WEDGED_MESSAGE = 'BLE setup wedged repeatedly';
const isConnectTimeoutError = (error: unknown): boolean =>
  (error as { errorCode?: unknown })?.errorCode === HardwareErrorCode.BleConnectedError &&
  typeof (error as { message?: unknown })?.message === 'string' &&
  (error as { message: string }).message.startsWith(CONNECT_TIMEOUT_MESSAGE);
const isWedgedBleSetupError = (error: unknown): boolean =>
  (error as { errorCode?: unknown })?.errorCode === HardwareErrorCode.PollingTimeout &&
  typeof (error as { message?: unknown })?.message === 'string' &&
  (error as { message: string }).message.startsWith(BLE_SETUP_WEDGED_MESSAGE);
const shouldRethrowBleSetupError = (error: unknown): boolean =>
  isConnectTimeoutError(error) || isWedgedBleSetupError(error);
const isNativeOperationTimeoutError = (error: unknown): boolean =>
  (error as { errorCode?: unknown })?.errorCode === BleErrorCode.OperationTimedOut;

export type IOneKeyDevice = OneKeyDeviceInfoBase & Device;

const tryToGetConfiguration = (device: Device) => {
  if (!device || !device.serviceUUIDs) return null;
  const serviceUUID = device.serviceUUIDs.find(uuid => getInfosForServiceUuid(uuid, 'classic'));
  if (!serviceUUID) return null;
  const infos = getInfosForServiceUuid(serviceUUID, 'classic');
  if (!infos) return null;
  return infos;
};

const requestNegotiatedMtu = async (
  device: Device,
  stage: 'connected' | 'servicesAndNotifyReady' | 'highThroughput',
  attempt: number
) => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return device;

  try {
    // iOS ignores the requested value but react-native-ble-plx returns a fresh
    // Device snapshot whose MTU is derived from CoreBluetooth's maximum write length.
    const mtuDevice = await device.requestMTU(getRequestedBleMtu());
    return mtuDevice;
  } catch (error) {
    Log?.debug('[ReactNativeBleTransport] MTU refresh failed, continuing with current value', {
      platform: Platform.OS,
      stage,
      attempt,
      actual: device.mtu,
      error: error instanceof Error ? error.message : String(error),
    });
    return device;
  }
};

const resolveNegotiatedMtu = (device: Device) => requestNegotiatedMtu(device, 'connected', 0);

type IOBleErrorRemap = Error | BleError | null | undefined;

function remapError(error: IOBleErrorRemap) {
  if (error instanceof BleError) {
    if (isNativeBleStaleBondError(error)) {
      throw toBleStaleBondHardwareError(error);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore It's not documented but seems to match a refusal on Android pairing
    if (error?.attErrorCode === 22) {
      throw ERRORS.TypedError(HardwareErrorCode.BleDeviceBondError);
    }
  }

  if (
    error instanceof Error &&
    error.message &&
    (error.message.includes('was disconnected') || error.message.includes('not found'))
  ) {
    throw ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected);
  }

  // @ts-expect-error
  throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, error.reason ?? error);
}

export default class ReactNativeBleTransport {
  blePlxManager: BlePlxManager | undefined;

  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  private protocolV2SchemaConfiguration: string | undefined;

  name = 'ReactNativeBleTransport';

  configured = false;

  stopped = false;

  scanTimeout = DEVICE_SCAN_TIMEOUT_MS;

  runPromise: Deferred<any> | null = null;

  private runPromiseDeviceId: string | null = null;

  emitter?: EventEmitter;

  firmwareUploadWriteRecoveryIds = new Set<string>();

  /** Per-device protocol type detected by active wire-level probe after connect. */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  /**
   * Protocol a probe is currently trying, before the device has confirmed it. Calls
   * must route with it, but acquire() must not treat it as a detected protocol: a
   * probe that never answers would otherwise leave the reuse fast path handing out a
   * transport that was never validated.
   */
  private probingProtocols: Map<string, ProtocolType> = new Map();

  /** Consecutive write timeouts per device; reset by any write that completes. */
  private writeTimeoutCounts: Map<string, number> = new Map();

  /** BLE setup timeouts per device since the last complete characteristic resolution. */
  private connectionSetupTimeoutCounts: Map<string, number> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

  /** Protocol this device actually answered on, kept across reconnects of one session. */
  private sessionProtocols: Map<string, ProtocolType> = new Map();

  /** Endpoints that answered a V2 probe in this transport lifetime. Survives disconnect. */
  private confirmedProtocolV2 = new Set<string>();

  /** Consecutive detections that failed while trusting sessionProtocols. */
  private protocolReprobeFailures: Map<string, number> = new Map();

  /**
   * Native encryption/pairing failures seen before Protocol V2 probe starts.
   * Pro2/Neo GATT connect can succeed on a stale iOS bond; the CCCD write then
   * fails with ATT 5/15. Remember it so detectProtocol fails immediately.
   */
  private staleBondErrors: Map<string, Error> = new Map();

  /** Strict or previously confirmed V2 target while acquire installs notifications. */
  private acquiringProtocolV2 = new Set<string>();

  private protocolV2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  private protocolV2FrameQueues: Map<string, Uint8Array[]> = new Map();

  private protocolV2FramePromises: Map<string, Deferred<Uint8Array>> = new Map();

  private protocolV2Links = new ProtocolV2LinkManager<string>({
    getSchemas: () => {
      if (!this._messages || !this._messagesV2) {
        throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
      }
      return {
        protocolV1: this._messages,
        protocolV2: this._messagesV2,
      };
    },
    classifyError: () => 'link-fatal',
    onLinkInvalidated: async (uuid, reason) => {
      this.protocolV2Assemblers.get(uuid)?.reset();
      this.rejectProtocolV2Frames(uuid, new Error(reason));
      Log?.debug('[ReactNativeBleTransport] Protocol V2 link invalidated:', uuid, reason);
      if (reason.startsWith('Protocol V2 link-fatal error:')) {
        await this.releaseNative(uuid, true);
      }
    },
  });

  private monitorTokens: Map<string, number> = new Map();

  private disconnectEventTokens: Map<string, number> = new Map();

  private protocolV2HighVolumeLogSignatures: Map<string, Set<string>> = new Map();

  private androidHighPriorityDevices: Set<string> = new Set();

  private androidPriorityResetTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private nextMonitorToken = 1;

  /** Serializes transport lifecycle changes for the same physical device. */
  private lifecycleOperations: Map<string, Promise<void>> = new Map();

  constructor(options: TransportOptions) {
    this.scanTimeout = options.scanTimeout ?? DEVICE_SCAN_TIMEOUT_MS;
  }

  init(logger: any, emitter: EventEmitter) {
    setBleLogger(logger);
    this.emitter = emitter;
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  configureProtocolV2(signedData: any) {
    const configuration = typeof signedData === 'string' ? signedData : JSON.stringify(signedData);
    if (this.protocolV2SchemaConfiguration === configuration) {
      return;
    }

    const isReconfiguration = this.protocolV2SchemaConfiguration !== undefined;
    this._messagesV2 = parseConfigure(signedData);
    this.protocolV2SchemaConfiguration = configuration;
    if (isReconfiguration) {
      this.protocolV2Links
        .invalidateAllLinks('Protocol V2 schema reconfigured')
        .catch(error => Log?.debug('Protocol V2 schema link cleanup failed:', error));
    }
  }

  listen() {
    // empty
  }

  getPlxManager(): Promise<BlePlxManager> {
    if (this.blePlxManager) return Promise.resolve(this.blePlxManager);
    this.blePlxManager = new BlePlxManager();
    return Promise.resolve(this.blePlxManager);
  }

  async resolveCharacteristics(device: Device): Promise<ResolvedBleCharacteristics> {
    await device.discoverAllServicesAndCharacteristics();
    let infos = tryToGetConfiguration(device);
    let characteristics: Characteristic[] | undefined;

    if (!infos) {
      for (const serviceUuid of getBluetoothServiceUuids()) {
        try {
          characteristics = await device.characteristicsForService(serviceUuid);
          infos = getInfosForServiceUuid(serviceUuid, 'classic');
          break;
        } catch (e) {
          Log?.error(e);
        }
      }
    }

    if (!infos) {
      const services = await device.services();
      Log?.debug(
        '[ReactNativeBleTransport] Known OneKey service UUID not found, discovered services:',
        services?.map(service => service.uuid)
      );
    }

    if (!infos) {
      try {
        Log?.debug('cancel connection when service not found');
        await device.cancelConnection();
      } catch (e) {
        Log?.debug('cancel connection error when service not found: ', e.message || e.reason);
      }
      throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound);
    }

    const { serviceUuid, writeUuid, notifyUuid } = infos;

    if (!serviceUuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound);
    }

    if (!characteristics) {
      characteristics = await device.characteristicsForService(serviceUuid);
    }

    if (!characteristics) {
      throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound);
    }

    let writeCharacteristic;
    let notifyCharacteristic;
    for (const c of characteristics) {
      if (isSameBleUuid(c.uuid, writeUuid)) {
        writeCharacteristic = c;
      } else if (isSameBleUuid(c.uuid, notifyUuid)) {
        notifyCharacteristic = c;
      }
    }

    if (!writeCharacteristic) {
      throw ERRORS.TypedError('BLECharacteristicNotFound: write characteristic not found');
    }

    if (!notifyCharacteristic) {
      throw ERRORS.TypedError('BLECharacteristicNotFound: notify characteristic not found');
    }

    if (!hasWritableCapability(writeCharacteristic)) {
      throw ERRORS.TypedError('BLECharacteristicNotWritable: write characteristic not writable');
    }

    if (!notifyCharacteristic.isNotifiable) {
      throw ERRORS.TypedError(
        'BLECharacteristicNotNotifiable: notify characteristic not notifiable'
      );
    }

    return {
      writeCharacteristic,
      notifyCharacteristic,
    };
  }

  attachDisconnectSubscription(transport: BleTransport, device: Device, uuid: string) {
    transport.disconnectSubscription?.remove();
    const { monitorToken } = transport;
    transport.disconnectSubscription = device.onDisconnected(() => {
      if (this.firmwareUploadWriteRecoveryIds.has(uuid)) {
        Log?.debug('device disconnect ignored during FirmwareUpload write recovery: ', uuid);
        return;
      }
      if (transportCache[uuid] !== transport) {
        Log?.debug('device disconnect ignored for stale transport: ', device?.id);
        return;
      }
      if (this.monitorTokens.get(uuid) !== monitorToken) {
        Log?.debug('device disconnect ignored for stale generation: ', device?.id);
        return;
      }

      try {
        Log?.debug('device disconnect: ', device?.id);
        this.emitDeviceDisconnect(uuid, device?.name, monitorToken);
        if (this.runPromise && this.runPromiseDeviceId === uuid) {
          const error = ERRORS.TypedError(HardwareErrorCode.BleConnectedError);
          this.runPromise.reject(error);
        }
      } catch (e) {
        Log?.debug('device disconnect error: ', e);
      } finally {
        this.release(uuid, true);
      }
    });
  }

  private emitDeviceDisconnect(uuid: string, name: string | null | undefined, token?: number) {
    if (token === undefined || this.disconnectEventTokens.get(uuid) === token) {
      return;
    }
    if (this.monitorTokens.get(uuid) !== token) {
      Log?.debug('device disconnect event ignored for stale generation: ', uuid);
      return;
    }
    this.disconnectEventTokens.set(uuid, token);
    this.emitter?.emit(TRANSPORT_EVENT.DEVICE_DISCONNECT, {
      name,
      id: uuid,
      connectId: uuid,
    });
  }

  async reconnectFirmwareUploadTransport(uuid: string, transport: BleTransport) {
    this.firmwareUploadWriteRecoveryIds.add(uuid);
    try {
      transport.disconnectSubscription?.remove();
      transport.disconnectSubscription = undefined;
      transport.notifySubscription?.remove();
      transport.notifySubscription = undefined;

      let { device } = transport;
      const isConnected = await device.isConnected().catch(() => false);
      if (!isConnected) {
        try {
          device = await this.connectWithTimeout(uuid, () => device.connect(connectOptions));
        } catch (e) {
          if (
            e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
            e.errorCode === BleErrorCode.OperationCancelled
          ) {
            device = await this.connectWithTimeout(uuid, () => device.connect());
          } else if (e.errorCode !== BleErrorCode.DeviceAlreadyConnected) {
            throw e;
          }
        }
      }

      const { writeCharacteristic, notifyCharacteristic } =
        await this.resolveCharacteristicsWithTimeout(uuid, device);

      transport.device = device;
      transport.writeCharacteristic = writeCharacteristic;
      transport.notifyCharacteristic = notifyCharacteristic;
      const monitorToken = this.nextMonitorToken;
      this.nextMonitorToken += 1;
      const notifyTransactionId = `${uuid}:notify:${monitorToken}`;
      transport.monitorToken = monitorToken;
      transport.notifyTransactionId = notifyTransactionId;
      this.monitorTokens.set(uuid, monitorToken);
      transport.notifySubscription = this._monitorCharacteristic(
        notifyCharacteristic,
        uuid,
        monitorToken,
        notifyTransactionId
      );
      this.attachDisconnectSubscription(transport, device, uuid);
    } finally {
      this.firmwareUploadWriteRecoveryIds.delete(uuid);
    }
  }

  /**
   * 获取设备列表
   * 在搜索超过超时时间或设备数量大于 5 台时，返回 OneKey 设备，
   * @returns
   */
  async enumerate() {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<IOneKeyDevice[]>(async (resolve, reject) => {
      const deviceList: IOneKeyDevice[] = [];
      const blePlxManager = await this.getPlxManager();
      try {
        await subscribeBleOn(blePlxManager);
      } catch (error) {
        Log?.debug('subscribeBleOn error: ', error);
        reject(error);
        return;
      }

      if (Platform.OS === 'android' && Platform.Version >= 31) {
        Log?.debug('requesting permissions, please wait...');

        const resultConnect = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);

        Log?.debug('requesting permissions, result: ', resultConnect);
        if (
          resultConnect[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== 'granted' ||
          resultConnect[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !== 'granted'
        ) {
          reject(ERRORS.TypedError(HardwareErrorCode.BlePermissionError));
          return;
        }
      }

      blePlxManager.startDeviceScan(
        getBluetoothServiceUuids(),
        {
          allowDuplicates: true,
          scanMode: ScanMode.LowLatency,
        },
        (error, device) => {
          if (error) {
            Log?.debug('ble scan error: ', error);
            if (
              [BleErrorCode.BluetoothPoweredOff, BleErrorCode.BluetoothInUnknownState].includes(
                error.errorCode
              )
            ) {
              reject(ERRORS.TypedError(HardwareErrorCode.BlePermissionError));
            } else if (error.errorCode === BleErrorCode.BluetoothUnauthorized) {
              reject(ERRORS.TypedError(HardwareErrorCode.BleLocationError));
            } else if (error.errorCode === BleErrorCode.LocationServicesDisabled) {
              reject(ERRORS.TypedError(HardwareErrorCode.BleLocationServicesDisabled));
            } else if (error.errorCode === BleErrorCode.ScanStartFailed) {
              // Android Bluetooth will report an error when the search frequency is too fast,
              // then nothing is processed and an empty array of devices is returned.
              // Then the next search will be back to normal
              timer.timeout(() => {}, this.scanTimeout);
            } else {
              reject(ERRORS.TypedError(HardwareErrorCode.BleScanError, error.reason ?? ''));
            }
            return;
          }

          const displayName = getDeviceDisplayName(device);
          // iOS may report a service-only advertisement before the named scan response.
          // Do not cache that incomplete advertisement as an unknown device.
          const isUnnamedIOSPeripheral = Platform.OS === 'ios' && !displayName?.trim();
          const isOneKey =
            !isUnnamedIOSPeripheral &&
            isOnekeyBluetoothDevice({
              id: device?.id,
              name: device?.name,
              localName: device?.localName,
              // The native scan is already restricted to the OneKey communication service,
              // but ble-plx permits the returned advertisement field to be null.
              serviceUuids: device?.serviceUUIDs ?? getBluetoothServiceUuids(),
            });
          if (isOneKey) {
            addDevice(device as unknown as Device);
          } else if (displayName && /\bpro\s*2\b/i.test(displayName)) {
            Log?.debug('[ReactNativeBleTransport] Pro2-like BLE device was not accepted:', {
              name: device?.name,
              localName: device?.localName,
              id: device?.id,
              serviceUUIDs: device?.serviceUUIDs,
            });
          }
        }
      );

      getConnectedDeviceIds(Platform.OS === 'ios' ? getBluetoothServiceUuids() : []).then(
        devices => {
          for (const device of devices) {
            const localName =
              'localName' in device && typeof device.localName === 'string'
                ? device.localName
                : null;
            if (
              isOnekeyBluetoothDevice({
                id: device.id,
                name: device.name,
                localName,
                serviceUuids: device.serviceUUIDs,
              })
            ) {
              Log?.debug('search connected peripheral: ', device.id);
              addDevice(device as unknown as Device);
            }
          }
        }
      );

      const addDevice = (device: Device) => {
        if (deviceList.every(d => d.id !== device.id)) {
          const displayName = getDeviceDisplayName(device) ?? 'Unknown BLE Device';

          deviceList.push({
            ...device,
            name: displayName,
            commType: 'ble',
          } as IOneKeyDevice);
          Log?.debug('[ReactNativeBleTransport] OneKey BLE device discovered', {
            deviceId: device.id,
            name: displayName,
            serviceUUIDs: device.serviceUUIDs,
          });
        }
      };

      timer.timeout(() => {
        blePlxManager.stopDeviceScan();
        resolve(deviceList);
      }, this.scanTimeout);
    });
  }

  private async installTransportForAcquire(
    uuid: string,
    device: Device,
    characteristics?: ResolvedBleCharacteristics
  ) {
    const { writeCharacteristic, notifyCharacteristic } =
      characteristics ?? (await this.resolveCharacteristicsWithTimeout(uuid, device));
    const transport = new BleTransport(device, writeCharacteristic, notifyCharacteristic);
    transport.mtuSize = typeof device.mtu === 'number' ? device.mtu : undefined;
    const monitorToken = this.nextMonitorToken;
    this.nextMonitorToken += 1;
    const notifyTransactionId = `${uuid}:notify:${monitorToken}`;
    transport.monitorToken = monitorToken;
    transport.notifyTransactionId = notifyTransactionId;
    this.monitorTokens.set(uuid, monitorToken);
    transport.notifySubscription = this._monitorCharacteristic(
      transport.notifyCharacteristic,
      uuid,
      monitorToken,
      notifyTransactionId
    );
    transportCache[uuid] = transport;
    this.protocolV2HighVolumeLogSignatures.set(uuid, new Set());
    this.protocolV2Assemblers.set(
      uuid,
      new ProtocolV2FrameAssembler(PROTOCOL_V2_BLE_FRAME_MAX_BYTES)
    );

    if (Platform.OS === 'ios') {
      await new Promise<void>(resolve => {
        setTimeout(resolve, IOS_NOTIFY_READY_DELAY_MS);
      });
    } else if (Platform.OS === 'android') {
      await delay(ANDROID_NOTIFY_READY_DELAY_MS);
    }

    const initialMtu = transport.mtuSize;
    let refreshAttempts = 0;
    if (
      (Platform.OS === 'ios' || Platform.OS === 'android') &&
      shouldRefreshNegotiatedMtu(transport.mtuSize)
    ) {
      refreshAttempts += 1;
      let refreshedDevice = await requestNegotiatedMtu(
        transport.device,
        'servicesAndNotifyReady',
        1
      );
      transport.device = refreshedDevice;
      transport.mtuSize =
        typeof refreshedDevice.mtu === 'number' ? refreshedDevice.mtu : transport.mtuSize;

      if (shouldRefreshNegotiatedMtu(transport.mtuSize)) {
        await delay(BLE_MTU_REFRESH_RETRY_DELAY_MS);
        refreshAttempts += 1;
        refreshedDevice = await requestNegotiatedMtu(transport.device, 'servicesAndNotifyReady', 2);
        transport.device = refreshedDevice;
        transport.mtuSize =
          typeof refreshedDevice.mtu === 'number' ? refreshedDevice.mtu : transport.mtuSize;
      }
    }

    Log?.debug('[ReactNativeBleTransport] BLE MTU ready', {
      platform: Platform.OS,
      requested: getRequestedBleMtu(),
      initial: initialMtu,
      actual: transport.mtuSize,
      refreshAttempts,
    });

    return transport;
  }

  async acquire(input: FirmwareInstallBleAcquireInput) {
    const { uuid } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    return this.runLifecycleOperation(uuid, () => this.acquireUnlocked(input));
  }

  private async acquireUnlocked(input: FirmwareInstallBleAcquireInput) {
    const { uuid, forceCleanRunPromise, expectedProtocol, skipProtocolProbe } = input;
    const shouldMapProtocolV2StaleBond = expectedProtocol
      ? expectedProtocol === 'V2'
      : this.confirmedProtocolV2.has(uuid);

    const cachedTransport = transportCache[uuid];
    if (skipProtocolProbe && !cachedTransport && this.blePlxManager) {
      Log?.debug(
        '[ReactNativeBleTransport] refresh uncached BLE connection for firmware install:',
        uuid
      );
      const manager = this.blePlxManager;
      await this.runNativeTeardown(uuid, manager, async () => {
        await this.runBestEffortNativeOperation(
          'firmware install reconnect: cancel uncached device connection',
          () => manager.cancelDeviceConnection(uuid)
        );
      });
    }
    if (cachedTransport) {
      if (skipProtocolProbe) {
        Log?.debug(
          '[ReactNativeBleTransport] refresh cached BLE connection for firmware install:',
          uuid
        );
        const manager = this.blePlxManager;
        await this.releaseUnlocked(uuid, true);
        await this.runNativeTeardown(uuid, manager, async () => {
          const operations: Promise<unknown>[] = [];
          if (manager) {
            operations.push(
              this.runBestEffortNativeOperation(
                'firmware install reconnect: cancel device connection',
                () => manager.cancelDeviceConnection(uuid)
              )
            );
          }
          operations.push(
            this.runBestEffortNativeOperation(
              'firmware install reconnect: device cancel connection',
              () => cachedTransport.device.cancelConnection()
            )
          );
          await Promise.all(operations);
        });
      } else {
        const cachedProtocol = this.deviceProtocol.get(uuid);
        const isCachedDeviceConnected = await cachedTransport.device
          .isConnected()
          .catch(() => false);
        if (
          isCachedDeviceConnected &&
          cachedProtocol &&
          (!expectedProtocol || cachedProtocol === expectedProtocol)
        ) {
          Log?.debug('[ReactNativeBleTransport] reuse cached BLE transport:', uuid, cachedProtocol);
          return { uuid, protocolType: cachedProtocol };
        }

        /**
         * If the transport is not reusable due to a protocol mismatch or stale
         * connection, clean it up before creating a new transport instance.
         */
        Log?.debug('transport not reusable, will release: ', uuid);
        await this.releaseUnlocked(uuid, true);
      }
    }

    let device: Device | null = null;

    if (forceCleanRunPromise && this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
      this.runPromiseDeviceId = null;
      Log?.debug('Force clean Bluetooth run promise, forceCleanRunPromise: ', forceCleanRunPromise);
    }

    const blePlxManager = await this.getPlxManager();
    try {
      await subscribeBleOn(blePlxManager);
    } catch (error) {
      Log?.debug('subscribeBleOn error: ', error);
      throw error;
    }

    if (!device) {
      const devices = await blePlxManager.devices([uuid]);
      [device] = devices;
    }

    if (!device) {
      const connectedDevice = await blePlxManager.connectedDevices(getBluetoothServiceUuids());
      const deviceFilter = connectedDevice.filter(device => device.id === uuid);
      Log?.debug(`found connected device count: ${deviceFilter.length}`);
      [device] = deviceFilter;
    }

    if (!device) {
      Log?.debug('try to connect to device: ', uuid);
      try {
        device = await this.connectWithTimeout(uuid, () =>
          blePlxManager.connectToDevice(uuid, connectOptions)
        );
      } catch (e) {
        Log?.debug('try to connect to device has error: ', e);
        if (shouldRethrowBleSetupError(e)) {
          throw e;
        }
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          Log?.debug('first try to reconnect without params');
          device = await this.connectWithTimeout(uuid, () =>
            blePlxManager.connectToDevice(uuid, fallbackConnectOptions)
          );
        } else if (e.errorCode === BleErrorCode.DeviceAlreadyConnected) {
          Log?.debug('device already connected');
          throw ERRORS.TypedError(HardwareErrorCode.BleAlreadyConnected);
        } else {
          remapError(e);
        }
      }
    }

    if (!device) {
      throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'unable to connect to device');
    }

    if (!(await device.isConnected())) {
      Log?.debug('not connected, try to connect to device: ', uuid);
      const disconnectedDevice = device;

      try {
        device = await this.connectWithTimeout(uuid, () =>
          disconnectedDevice.connect(connectOptions)
        );
      } catch (e) {
        Log?.debug('not connected, try to connect to device has error: ', e);
        if (shouldRethrowBleSetupError(e)) {
          throw e;
        }
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          Log?.debug('second try to reconnect without params');
          try {
            device = await this.connectWithTimeout(uuid, () =>
              disconnectedDevice.connect(fallbackConnectOptions)
            );
          } catch (fallbackError) {
            Log?.debug('last try to reconnect error: ', fallbackError);
            // last try to reconnect device if this issue exists
            // https://github.com/dotintent/react-native-ble-plx/issues/426
            if (fallbackError.errorCode === BleErrorCode.OperationCancelled) {
              Log?.debug('last try to reconnect');
              await disconnectedDevice.cancelConnection();
              device = await this.connectWithTimeout(uuid, () =>
                disconnectedDevice.connect(fallbackConnectOptions)
              );
            } else {
              remapError(fallbackError);
            }
          }
        } else {
          remapError(e);
        }
      }
    }

    if (Platform.OS === 'android') {
      if (!(await device.isConnected().catch(() => false))) {
        throw ERRORS.TypedError(
          HardwareErrorCode.BleConnectedError,
          `Device ${uuid} is not connected before bonding`
        );
      }
      // Establish the LE link before createBond(). Without an existing LE ACL,
      // Android TRANSPORT_AUTO can choose BR/EDR for a BLE-only device.
      const connectedDevice = device;
      try {
        const bondState = await pairDevice(uuid);
        if (bondState.bonding) {
          await onDeviceBondState(uuid);
        } else if (!bondState.bonded) {
          throw ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'device is not bonded');
        }
      } catch (error) {
        await this.runNativeTeardown(uuid, blePlxManager, async () => {
          await Promise.all([
            this.runBestEffortNativeOperation('bond failure: cancel manager connection', () =>
              blePlxManager.cancelDeviceConnection(uuid)
            ),
            this.runBestEffortNativeOperation('bond failure: cancel device connection', () =>
              connectedDevice.cancelConnection()
            ),
          ]);
        });
        throw error;
      }
    }

    device = await resolveNegotiatedMtu(device);
    const acquiredDevice = device;
    const { writeCharacteristic, notifyCharacteristic } =
      await this.resolveCharacteristicsWithTimeout(uuid, acquiredDevice);

    const protocolHint = expectedProtocol
      ? undefined
      : input.protocolHint ?? this.deviceProtocolHints.get(uuid);

    // release transport before new transport instance
    await this.releaseUnlocked(uuid, true);
    if (protocolHint) {
      this.deviceProtocolHints.set(uuid, protocolHint);
    }

    if (shouldMapProtocolV2StaleBond) {
      this.acquiringProtocolV2.add(uuid);
    }

    try {
      await this.installTransportForAcquire(uuid, acquiredDevice, {
        writeCharacteristic,
        notifyCharacteristic,
      });

      if (skipProtocolProbe) {
        if (!expectedProtocol) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            'skipProtocolProbe requires an expected BLE protocol'
          );
        }
        const hasConfirmedProtocol =
          this.sessionProtocols.get(uuid) === expectedProtocol ||
          (expectedProtocol === 'V2' && this.confirmedProtocolV2.has(uuid));
        if (!hasConfirmedProtocol) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            'skipProtocolProbe requires a previously confirmed protocol for this BLE endpoint'
          );
        }
        this.deviceProtocol.set(uuid, expectedProtocol);
        this.sessionProtocols.set(uuid, expectedProtocol);
        this.protocolReprobeFailures.delete(uuid);
        Log?.debug('[ReactNativeBleTransport] protocol selected without probe', {
          deviceId: uuid,
          protocol: expectedProtocol,
          source: 'firmware-install-reconnect',
        });
        const currentTransport = transportCache[uuid];
        if (!currentTransport) {
          throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
        }
        this.attachDisconnectSubscription(currentTransport, currentTransport.device, uuid);
        return { uuid, protocolType: expectedProtocol };
      }

      const protocolType = await this.detectProtocol(
        uuid,
        expectedProtocol,
        protocolHint,
        async () => {
          await this.installTransportForAcquire(uuid, acquiredDevice);
        }
      );
      const currentTransport = transportCache[uuid];
      if (!currentTransport) {
        throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
      }
      this.attachDisconnectSubscription(currentTransport, currentTransport.device, uuid);
      return { uuid, protocolType };
    } catch (error) {
      if (isBleStaleBondHardwareError(error)) {
        await this.disconnectUnlocked(uuid);
      } else {
        await this.releaseUnlocked(uuid, true);
      }
      throw error;
    } finally {
      this.acquiringProtocolV2.delete(uuid);
    }
  }

  _monitorCharacteristic(
    characteristic: Characteristic,
    uuid: string,
    monitorToken: number,
    notifyTransactionId: string
  ): Subscription {
    let bufferLength = 0;
    let buffer: any[] = [];
    const subscription = characteristic.monitor((error, c) => {
      const isCurrentMonitor = this.monitorTokens.get(uuid) === monitorToken;
      if (error) {
        Log?.debug(
          `error monitor ${characteristic.uuid}, deviceId: ${characteristic.deviceID}: ${
            error as unknown as string
          }`
        );
        if (this.firmwareUploadWriteRecoveryIds.has(uuid)) {
          Log?.debug('notify error ignored during FirmwareUpload write recovery: ', uuid);
          return;
        }
        if (!isCurrentMonitor) {
          Log?.debug('monitor error ignored for stale transport: ', uuid, notifyTransactionId);
          return;
        }
        if (
          (this.getActiveProtocol(uuid) === 'V2' || this.acquiringProtocolV2.has(uuid)) &&
          isNativeBleStaleBondError(error)
        ) {
          this.rememberStaleBondError(uuid, toBleStaleBondHardwareError(error));
          return;
        }
        if (this.getActiveProtocol(uuid) === 'V2') {
          let errorCode:
            | typeof HardwareErrorCode.BleCharacteristicNotifyError
            | typeof HardwareErrorCode.BleCharacteristicNotifyChangeFailure
            | typeof HardwareErrorCode.BleTimeoutError =
            HardwareErrorCode.BleCharacteristicNotifyError;
          if (error.reason?.includes('The connection has timed out unexpectedly')) {
            errorCode = HardwareErrorCode.BleTimeoutError;
          } else if (
            error.reason?.includes('Cannot write client characteristic config descriptor') ||
            error.reason?.includes('Cannot find client characteristic config descriptor') ||
            error.reason?.includes('The handle is invalid') ||
            error.reason?.includes('Writing is not permitted') ||
            error.reason?.includes('notify change failed for device')
          ) {
            errorCode = HardwareErrorCode.BleCharacteristicNotifyChangeFailure;
          }
          this.rejectProtocolV2Frames(uuid, ERRORS.TypedError(errorCode));
          return;
        }
        if (this.runPromise && this.runPromiseDeviceId === uuid) {
          let ERROR:
            | typeof HardwareErrorCode.BleCharacteristicNotifyError
            | typeof HardwareErrorCode.BleTimeoutError =
            HardwareErrorCode.BleCharacteristicNotifyError;
          if (error.reason?.includes('The connection has timed out unexpectedly')) {
            ERROR = HardwareErrorCode.BleTimeoutError;
          }
          if (
            error.reason?.includes('Cannot write client characteristic config descriptor') ||
            error.reason?.includes('Cannot find client characteristic config descriptor') || // pro firmware 2.3.0 upgrade
            error.reason?.includes('The handle is invalid') ||
            error.reason?.includes('Writing is not permitted') || // pro firmware 2.3.4 upgrade
            error.reason?.includes('notify change failed for device')
          ) {
            const notifyError = ERRORS.TypedError(
              HardwareErrorCode.BleCharacteristicNotifyChangeFailure
            );
            this.runPromise.reject(notifyError);
            Log?.debug(
              `${HardwareErrorCode.BleCharacteristicNotifyChangeFailure} ${error.message}    ${error.reason}`
            );
            return;
          }
          const notifyError = ERRORS.TypedError(ERROR);
          this.runPromise.reject(notifyError);
          Log?.debug(': monitor notify error, and has unreleased Promise', Error);
        }

        return;
      }

      if (!isCurrentMonitor) {
        Log?.debug('monitor data ignored for stale transport: ', uuid, notifyTransactionId);
        return;
      }

      if (!c) {
        throw ERRORS.TypedError(HardwareErrorCode.BleMonitorError);
      }

      try {
        const data = Buffer.from(c.value as string, 'base64');
        const protocol = this.getActiveProtocol(uuid);
        if (!protocol) {
          Log?.debug('monitor data ignored before protocol detection: ', uuid);
          return;
        }
        if (protocol === 'V2') {
          this.handleProtocolV2Notification(uuid, monitorToken, new Uint8Array(data));
          return;
        }
        // console.log('[hd-transport-react-native] Received a packet, ', 'buffer: ', data);
        if (isHeaderChunk(data)) {
          bufferLength = data.readInt32BE(5);
          buffer = [...data.subarray(3)];
        } else {
          buffer = buffer.concat([...data]);
        }

        if (buffer.length - PROTOCOL_V1_MESSAGE_HEADER_SIZE >= bufferLength) {
          const value = Buffer.from(buffer);
          // console.log(
          //   '[hd-transport-react-native] Received a complete packet of data, resolve Promise, this.runPromise: ',
          //   this.runPromise,
          //   'buffer: ',
          //   value
          // );
          bufferLength = 0;
          buffer = [];
          if (this.runPromiseDeviceId === uuid) {
            this.runPromise?.resolve(value.toString('hex'));
          }
        }
      } catch (error) {
        Log?.debug('monitor data error: ', error);
        const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
        if (this.getActiveProtocol(uuid) === 'V2') {
          this.rejectProtocolV2Frames(uuid, notifyError);
        } else if (this.runPromiseDeviceId === uuid) {
          this.runPromise?.reject(notifyError);
        }
      }
    }, notifyTransactionId);

    return subscription;
  }

  async release(uuid: string, onclose = false) {
    return this.runLifecycleOperation(uuid, () => this.releaseUnlocked(uuid, onclose));
  }

  private async releaseUnlocked(uuid: string, onclose = false) {
    await this.protocolV2Links.invalidateLink(uuid, 'React Native BLE transport released');
    return this.releaseNative(uuid, onclose);
  }

  private async releaseNative(uuid: string, onclose = false) {
    const transport = transportCache[uuid];
    const manager = this.blePlxManager;
    if (this.runPromise && this.runPromiseDeviceId === uuid) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
      this.runPromiseDeviceId = null;
      this.rejectProtocolV2Frames(uuid, error);
    } else {
      this.resetProtocolV2Frames(uuid);
    }

    if (Platform.OS === 'android' && !onclose && transport) {
      this.protocolV2Assemblers.get(uuid)?.reset();
      this.resetProtocolV2Frames(uuid);
      return Promise.resolve(true);
    }

    if (transport) {
      if (this.monitorTokens.get(uuid) === transport.monitorToken) {
        this.monitorTokens.delete(uuid);
      }

      // Clean up disconnect subscription first to prevent callbacks on released transport
      Log?.debug('release: removing disconnect subscription for device: ', uuid);
      transport.disconnectSubscription?.remove();
      transport.disconnectSubscription = undefined;

      // Clean up notify subscription
      Log?.debug(
        'release: removing notify subscription, characteristic: ',
        transport.notifyCharacteristic?.uuid
      );
      transport.notifySubscription?.remove();
      transport.notifySubscription = undefined;
      if (transportCache[uuid] === transport) {
        delete transportCache[uuid];
      }
    }

    this.protocolV2HighVolumeLogSignatures.delete(uuid);

    this.deviceProtocol.delete(uuid);
    this.probingProtocols.delete(uuid);
    this.staleBondErrors.delete(uuid);
    this.acquiringProtocolV2.delete(uuid);
    // Confirmed protocol and caller hints stay in deviceProtocol / protocolHint.
    this.protocolV2Assemblers.get(uuid)?.reset();
    this.protocolV2Assemblers.delete(uuid);
    this.resetProtocolV2Frames(uuid);

    await this.runNativeTeardown(uuid, manager, async () => {
      const operations: Promise<unknown>[] = [
        this.runBestEffortNativeOperation('release: restore connection priority', () =>
          this.restoreAndroidConnectionPriority(uuid, transport)
        ),
      ];
      if (transport?.notifyTransactionId && manager) {
        operations.push(
          this.runBestEffortNativeOperation('release: cancel notify transaction', () =>
            manager.cancelTransaction(transport.notifyTransactionId as string)
          )
        );
      }
      if (manager) {
        operations.push(
          this.runBestEffortNativeOperation('release: cancel transaction', () =>
            manager.cancelTransaction(uuid)
          )
        );
      }
      await Promise.all(operations);
    });

    return Promise.resolve(true);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    if (this.getProtocolType(session) === 'V2') {
      await this.protocolV2Links.sendFlowControl(
        session,
        () => this.createProtocolV2Adapter(session),
        name,
        data
      );
      return;
    }
    await this.call(session, name, data);
  }

  async call(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (this.stopped) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject(ERRORS.TypedError('Transport stopped.'));
    }
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const protocol = this.getProtocolType(uuid);
    if (!protocol) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Device protocol has not been detected for ${uuid}`
      );
    }
    if (protocol === 'V2') {
      return this.callProtocolV2(uuid, name, data, options);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    return this.callProtocolV1(uuid, name, data, options);
  }

  private async callProtocolV1(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const transport = this.getCachedTransport(uuid);
    const runPromise = createDeferred<string>();
    runPromise.promise.catch(() => undefined);
    const supersededRunPromise = this.runPromise;
    if (supersededRunPromise) {
      // Only forceRun calls (Initialize/Cancel) reach here with a pending call. Settle
      // the superseded deferred now so its response race resolves and its finally block
      // clears its timeout timer; an orphaned timer would otherwise fire much later and
      // tear down the shared connection while another call is using it.
      supersededRunPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
    }
    this.runPromise = runPromise;
    this.runPromiseDeviceId = uuid;
    // A superseded call's late write failure must not clear the successor's ownership;
    // only the call that still owns the slot may release it.
    const releaseOwnershipIfCurrent = () => {
      if (this.runPromise === runPromise) {
        this.runPromise = null;
        this.runPromiseDeviceId = null;
      }
    };
    const isCurrentOwner = () => this.runPromise === runPromise;
    const messages = this._messages;
    const buffers = ProtocolV1.encodeTransportPackets(messages, name, data);
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function writeChunkedData(
      buffers: ByteBuffer[],
      writeFunction: (data: string) => Promise<void>,
      onError: (e: any) => void
    ) {
      const packetCapacity = Platform.OS === 'ios' ? IOS_PACKET_LENGTH : ANDROID_PACKET_LENGTH;
      let index = 0;
      let chunk = ByteBuffer.allocate(packetCapacity);

      while (index < buffers.length) {
        const buffer = buffers[index].toBuffer();
        chunk.append(buffer);
        index += 1;

        if (chunk.offset === packetCapacity || index >= buffers.length) {
          chunk.reset();
          try {
            await writeFunction(chunk.toString('base64'));
            chunk = ByteBuffer.allocate(packetCapacity);
          } catch (e) {
            onError(e);
            if (isWedgedWriteError(e)) {
              throw e;
            }
            throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
          }
        }
      }
    }

    async function writeFirmwareUploadChunkedData(
      buffers: ByteBuffer[],
      writeFunction: (data: string) => Promise<void>,
      onError: (e: any) => void
    ) {
      let index = 0;
      let packetsWritten = 0;
      let chunk = ByteBuffer.allocate(FIRMWARE_UPLOAD_WRITE_PACKET_CAPACITY);

      while (index < buffers.length) {
        const buffer = buffers[index].toBuffer();
        chunk.append(buffer);
        index += 1;

        if (chunk.offset === FIRMWARE_UPLOAD_WRITE_PACKET_CAPACITY || index >= buffers.length) {
          chunk.reset();
          try {
            await writeFunction(chunk.toString('base64'));
            packetsWritten += 1;
            chunk = ByteBuffer.allocate(FIRMWARE_UPLOAD_WRITE_PACKET_CAPACITY);
            if (packetsWritten % FIRMWARE_UPLOAD_WRITE_BURST_SIZE === 0 && index < buffers.length) {
              await delay(FIRMWARE_UPLOAD_WRITE_PAUSE_MS);
            }
          } catch (e) {
            onError(e);
            if (isWedgedWriteError(e)) {
              throw e;
            }
            throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
          }
        }
      }

      if (packetsWritten > 0) {
        await delay(FIRMWARE_UPLOAD_WRITE_FLUSH_DELAY_MS);
      }
    }

    if (name === 'EmmcFileWrite') {
      await writeChunkedData(
        buffers,
        data =>
          this.writeBlePacket(
            uuid,
            data,
            payload => transport.writeWithRetry(payload),
            isCurrentOwner
          ),
        e => {
          releaseOwnershipIfCurrent();
          Log?.error('writeCharacteristic write error: ', e);
        }
      );
    } else if (name === 'FirmwareUpload') {
      Log?.debug('[ReactNativeBleTransport] Firmware upload transport configured', {
        packetCapacity: FIRMWARE_UPLOAD_WRITE_PACKET_CAPACITY,
        burstSize: FIRMWARE_UPLOAD_WRITE_BURST_SIZE,
        pauseMs: FIRMWARE_UPLOAD_WRITE_PAUSE_MS,
        flushDelayMs: FIRMWARE_UPLOAD_WRITE_FLUSH_DELAY_MS,
        maxRetries: FIRMWARE_UPLOAD_WRITE_MAX_RETRIES,
      });
      await writeFirmwareUploadChunkedData(
        buffers,
        async data => {
          let attempt = 0;
          // Retry only congestion. Other write errors should surface immediately.
          // GATT_CONGESTED is usually transient backpressure from the Android BLE queue.
          // eslint-disable-next-line no-constant-condition
          while (true) {
            try {
              await this.writeBlePacket(
                uuid,
                data,
                payload => transport.writeWithRetry(payload),
                isCurrentOwner
              );
              return;
            } catch (error) {
              const retryType = getFirmwareUploadWriteRetryType(error);
              if (!retryType || attempt >= FIRMWARE_UPLOAD_WRITE_MAX_RETRIES) {
                throw error;
              }
              const delayMs = resolveFirmwareUploadRetryDelay(attempt);
              Log?.debug('[ReactNativeBleTransport] FirmwareUpload write retry:', {
                attempt: attempt + 1,
                delayMs,
                error,
              });
              await delay(delayMs);
              attempt += 1;
            }
          }
        },
        e => {
          releaseOwnershipIfCurrent();
          Log?.error('writeCharacteristic write error: ', e);
        }
      );
    } else {
      for (const o of buffers) {
        const outData = o.toString('base64');
        // Upload resources on low-end phones may OOM
        try {
          const shouldUseWriteWithResponse =
            Platform.OS === 'ios' && transport.writeCharacteristic.isWritableWithResponse;
          await this.writeBlePacket(
            uuid,
            outData,
            payload =>
              shouldUseWriteWithResponse
                ? transport.writeCharacteristic.writeWithResponse(payload)
                : transport.writeCharacteristic.writeWithoutResponse(payload),
            isCurrentOwner
          );
        } catch (e) {
          Log?.debug('writeCharacteristic write error: ', e);
          releaseOwnershipIfCurrent();
          if (isWedgedWriteError(e)) {
            throw e;
          }
          if (e.errorCode === BleErrorCode.DeviceDisconnected) {
            throw ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded);
          } else if (e.errorCode === BleErrorCode.OperationStartFailed) {
            throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, e.reason);
          } else {
            throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
          }
        }
      }
    }

    try {
      const response = await Promise.race([
        runPromise.promise,
        new Promise<never>((_, reject) => {
          if (options?.timeoutMs) {
            timeout = setTimeout(() => {
              const error = ERRORS.TypedError(
                HardwareErrorCode.BleTimeoutError,
                `BLE response timeout after ${options.timeoutMs}ms for ${name}`
              );
              runPromise.reject(error);
              reject(error);
            }, options.timeoutMs);
          }
        }),
      ]);

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      const jsonData = ProtocolV1.decodeMessage(messages, response);
      return check.call(jsonData);
    } catch (e) {
      if (name === 'GetFeatures' && options?.timeoutMs === PROTOCOL_PROBE_TIMEOUT_MS) {
        Log?.debug('[ReactNativeBleTransport] Protocol V1 GetFeatures probe call failed:', e);
      } else {
        Log?.error('call error: ', e);
      }
      const isProbeTimeout =
        name === 'GetFeatures' && options?.timeoutMs === PROTOCOL_PROBE_TIMEOUT_MS;
      // A call that has been superseded (forceRun) or cleaned up no longer owns the
      // transport; its late timeout must not tear down the connection the current
      // call is actively using.
      const isStaleCall = this.runPromise !== runPromise;
      if (
        !isProbeTimeout &&
        !isStaleCall &&
        (e as { errorCode?: unknown })?.errorCode === HardwareErrorCode.BleTimeoutError
      ) {
        await this.disconnect(uuid);
      }
      throw e;
    } finally {
      if (timeout) clearTimeout(timeout);
      if (this.runPromise === runPromise) {
        this.runPromise = null;
        this.runPromiseDeviceId = null;
      }
    }
  }

  stop() {
    this.stopped = true;
  }

  async disconnect(session: string) {
    return this.runLifecycleOperation(session, () => this.disconnectUnlocked(session));
  }

  private async disconnectUnlocked(session: string) {
    await this.protocolV2Links.invalidateLink(session, 'React Native BLE transport disconnected');
    const transport = transportCache[session];
    const manager = this.blePlxManager;
    const monitorToken = transport?.monitorToken ?? this.monitorTokens.get(session);

    // Clean up disconnect subscription first to prevent onDisconnected callback
    // from being triggered when we cancel the connection below
    if (transport?.disconnectSubscription) {
      try {
        Log?.debug('disconnect: removing disconnect subscription');
        transport.disconnectSubscription.remove();
        transport.disconnectSubscription = undefined;
      } catch (e) {
        Log?.debug('disconnect: remove disconnect subscription error (ignored): ', e);
      }
    }

    // cancel the notify subscription
    if (transport?.notifySubscription) {
      try {
        Log?.debug(
          'disconnect: removing notify subscription, characteristic: ',
          transport.notifyCharacteristic?.uuid
        );
        transport.notifySubscription.remove();
        transport.notifySubscription = undefined;
      } catch (e) {
        Log?.error('disconnect: remove notify subscription error: ', e);
      }
    }

    // clear the transport cache
    if (!transport || transportCache[session] === transport) {
      delete transportCache[session];
    }
    this.deviceProtocol.delete(session);
    this.probingProtocols.delete(session);
    this.staleBondErrors.delete(session);
    this.deviceProtocolHints.delete(session);
    this.sessionProtocols.delete(session);
    this.protocolReprobeFailures.delete(session);
    this.protocolV2Assemblers.delete(session);
    this.resetProtocolV2Frames(session);

    // emit the disconnect event
    try {
      this.emitDeviceDisconnect(session, transport?.device?.name, monitorToken);
    } catch (e) {
      Log?.error('resetSession: emit disconnect event error: ', e);
    }
    if (monitorToken !== undefined && this.monitorTokens.get(session) === monitorToken) {
      this.monitorTokens.delete(session);
    }

    await this.runNativeTeardown(session, manager, async () => {
      const operations: Promise<unknown>[] = [];
      if (manager) {
        operations.push(
          this.runBestEffortNativeOperation('disconnect: cancel transaction', () =>
            manager.cancelTransaction(session)
          )
        );
        operations.push(
          this.runBestEffortNativeOperation('disconnect: cancel device connection', () =>
            manager.cancelDeviceConnection(session)
          )
        );
      }
      if (transport?.device) {
        operations.push(
          this.runBestEffortNativeOperation('disconnect: device cancel connection', () =>
            transport.device.cancelConnection()
          )
        );
      }
      await Promise.all(operations);
    });

    // eslint-disable-next-line no-promise-executor-return
    await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
  }

  private async runNativeTeardown(
    uuid: string,
    manager: BlePlxManager | undefined,
    teardown: () => Promise<void>
  ) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const pending = Promise.resolve()
      .then(teardown)
      .catch(error => {
        Log?.debug('BLE native teardown error (ignored): ', error?.message || error);
      });
    try {
      await Promise.race([
        pending,
        new Promise<void>(resolve => {
          timer = setTimeout(() => {
            timedOut = true;
            resolve();
          }, BLE_NATIVE_TEARDOWN_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (timedOut) {
      Log?.error('[ReactNativeBleTransport] BLE native teardown timed out:', uuid);
      if (this.blePlxManager === manager) {
        this.resetPlxManager();
      }
    }
  }

  private runBestEffortNativeOperation(label: string, operation: () => Promise<unknown>) {
    return Promise.resolve()
      .then(operation)
      .catch(error => {
        Log?.debug(`${label} error (ignored): `, error?.message || error);
      });
  }

  private async runLifecycleOperation<T>(uuid: string, operation: () => Promise<T>): Promise<T> {
    const previousOperation = this.lifecycleOperations.get(uuid) ?? Promise.resolve();
    let completeOperation!: () => void;
    const operationGate = new Promise<void>(resolve => {
      completeOperation = resolve;
    });
    const operationTail = previousOperation.catch(() => undefined).then(() => operationGate);
    this.lifecycleOperations.set(uuid, operationTail);

    await previousOperation.catch(() => undefined);
    try {
      return await operation();
    } finally {
      completeOperation();
      if (this.lifecycleOperations.get(uuid) === operationTail) {
        this.lifecycleOperations.delete(uuid);
      }
    }
  }

  cancel() {
    Log?.debug('transport-react-native transport cancel');
    if (this.runPromise) {
      // this.runPromise.reject(new Error('Transport_CallCanceled'));
    }
    this.runPromise = null;
    this.runPromiseDeviceId = null;
  }

  /** Run a native connect under the JS backstop budget. */
  private async connectWithTimeout<T>(uuid: string, connect: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const pending = connect();
    // The abandoned attempt keeps running; swallow its late outcome so it cannot
    // surface as an unhandled rejection after we have already given up on it.
    pending.catch(() => undefined);
    try {
      const result = await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(
              ERRORS.TypedError(
                HardwareErrorCode.BleConnectedError,
                `BLE connect timeout after ${BLE_CONNECT_TIMEOUT_MS}ms for ${uuid}`
              )
            );
          }, BLE_CONNECT_TIMEOUT_MS);
        }),
      ]);
      return result;
    } catch (error) {
      if (timedOut || isNativeOperationTimeoutError(error)) {
        const resetManager = this.abandonStalledConnection(
          uuid,
          timedOut ? 'connect-backstop' : 'connect-native'
        );
        if (resetManager) {
          throw this.createWedgedBleSetupError();
        }
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Resolve the complete GATT shape under a budget so acquire() always settles. */
  private async resolveCharacteristicsWithTimeout(
    uuid: string,
    device: Device
  ): Promise<ResolvedBleCharacteristics> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const pending = this.resolveCharacteristics(device);
    pending.catch(() => undefined);
    try {
      const result = await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(
              ERRORS.TypedError(
                HardwareErrorCode.BleConnectedError,
                `BLE GATT setup timeout after ${BLE_GATT_SETUP_TIMEOUT_MS}ms for ${uuid}`
              )
            );
          }, BLE_GATT_SETUP_TIMEOUT_MS);
        }),
      ]);
      this.connectionSetupTimeoutCounts.delete(uuid);
      return result;
    } catch (error) {
      if (timedOut || isNativeOperationTimeoutError(error)) {
        const resetManager = this.abandonStalledConnection(
          uuid,
          timedOut ? 'gatt-backstop' : 'gatt-native'
        );
        if (resetManager) {
          throw this.createWedgedBleSetupError();
        }
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Give up on a BLE setup operation the native layer did not settle. The abandoned
   * operation still owns native connection/GATT state that can poison the next attempt,
   * so it is cleared here without awaiting the same queue that stopped responding.
   * Returns true when the manager itself was reset so the caller can stop Core retries.
   */
  private abandonStalledConnection(
    uuid: string,
    stage: 'connect-backstop' | 'connect-native' | 'gatt-backstop' | 'gatt-native'
  ): boolean {
    const timeouts = (this.connectionSetupTimeoutCounts.get(uuid) ?? 0) + 1;
    this.connectionSetupTimeoutCounts.set(uuid, timeouts);
    Log?.error('[ReactNativeBleTransport] BLE setup timed out:', uuid, {
      stage,
      setupTimeoutsSinceSuccess: timeouts,
    });

    this.blePlxManager?.cancelDeviceConnection(uuid).catch(() => {
      // Rejects with "Operation was cancelled" while merely connecting — expected.
    });
    const stalled = transportCache[uuid];
    if (stalled) {
      delete transportCache[uuid];
    }
    this.deviceProtocol.delete(uuid);
    this.probingProtocols.delete(uuid);
    this.staleBondErrors.delete(uuid);
    this.acquiringProtocolV2.delete(uuid);
    this.protocolV2Assemblers.delete(uuid);
    this.resetProtocolV2Frames(uuid);

    if (timeouts >= BLE_CONNECT_TIMEOUT_MANAGER_RESET_THRESHOLD) {
      // BleManager.destroy() force-rejects every promise the native queue abandoned —
      // the only JS-reachable way to settle them — and drops all cached peripherals.
      Log?.error('[ReactNativeBleTransport] BLE setup wedged repeatedly, resetting BLE manager');
      this.resetPlxManager();
      this.connectionSetupTimeoutCounts.delete(uuid);
      return true;
    }
    return false;
  }

  private createWedgedBleSetupError() {
    // PollingTimeout is not retried by connectDeviceForBle and already maps
    // to the App "connection failed" help text.
    return ERRORS.TypedError(HardwareErrorCode.PollingTimeout, BLE_SETUP_WEDGED_MESSAGE);
  }

  private getCachedTransport(uuid: string) {
    const transport = transportCache[uuid];
    if (!transport) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
    }
    return transport;
  }

  /**
   * Write one packet under a bounded budget. A write that never settles means the
   * peripheral is wedged even though the GATT link still reports connected, so the
   * link is torn down: releasing JS state alone would leave the poisoned peripheral
   * cached and every later call would hang on it again.
   */
  private async writeBlePacket(
    uuid: string,
    data: string,
    write: (payload: string) => Promise<unknown>,
    isCurrentOwner?: () => boolean
  ) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      await Promise.race([
        write(data),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(
              ERRORS.TypedError(
                HardwareErrorCode.BleWriteCharacteristicError,
                `BLE write timeout after ${BLE_WRITE_PACKET_TIMEOUT_MS}ms`
              )
            );
          }, BLE_WRITE_PACKET_TIMEOUT_MS);
        }),
      ]);
      this.writeTimeoutCounts.delete(uuid);
    } catch (error) {
      if (timedOut) {
        // A superseded call's late write must not tear down the link the current
        // call is using; only the owner of the transport may declare it dead.
        if (isCurrentOwner && !isCurrentOwner()) {
          Log?.debug('[ReactNativeBleTransport] stale BLE write timed out, link kept:', uuid);
        } else {
          this.tearDownWedgedLink(uuid);
        }
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Drop a link whose writes stopped completing. The JS state is purged synchronously
   * so the next acquire() cannot reuse the dead transport, while the native teardown is
   * intentionally NOT awaited: it talks to the very layer that just stopped settling
   * promises, so awaiting it could hang exactly like the write it is recovering from.
   */
  private tearDownWedgedLink(uuid: string) {
    const timeouts = (this.writeTimeoutCounts.get(uuid) ?? 0) + 1;
    this.writeTimeoutCounts.set(uuid, timeouts);
    Log?.error('[ReactNativeBleTransport] BLE write timed out, tearing down link:', uuid, {
      consecutiveWriteTimeouts: timeouts,
    });

    const wedged = transportCache[uuid];
    this.disconnect(uuid).catch(error => {
      Log?.debug('[ReactNativeBleTransport] wedged link teardown failed (ignored):', error);
    });
    if (wedged && transportCache[uuid] === wedged) {
      delete transportCache[uuid];
    }
    this.deviceProtocol.delete(uuid);
    this.probingProtocols.delete(uuid);
    this.staleBondErrors.delete(uuid);
    this.acquiringProtocolV2.delete(uuid);
    this.protocolV2Assemblers.delete(uuid);
    this.resetProtocolV2Frames(uuid);

    if (timeouts >= BLE_WRITE_TIMEOUT_MANAGER_RESET_THRESHOLD) {
      // Reconnecting reuses the same native peripheral object. When it stays wedged
      // across attempts the poison lives in the BLE manager itself, and only a fresh
      // manager drops every cached peripheral — the JS equivalent of restarting the app.
      Log?.error('[ReactNativeBleTransport] BLE writes wedged repeatedly, resetting BLE manager');
      this.resetPlxManager();
      this.writeTimeoutCounts.delete(uuid);
    }
  }

  private resetPlxManager() {
    const manager = this.blePlxManager;
    this.blePlxManager = undefined;
    const reason = 'React Native BLE manager reset';
    // Destroying the shared manager invalidates every peripheral it owns. Notify
    // each cached session before clearing generations so Core cannot retain a
    // silently stale connection for an unrelated device.
    Object.entries(transportCache).forEach(([uuid, cachedTransport]) => {
      try {
        cachedTransport.disconnectSubscription?.remove();
      } catch (error) {
        Log?.debug('BLE manager reset disconnect subscription removal failed:', error);
      }
      cachedTransport.disconnectSubscription = undefined;
      try {
        cachedTransport.notifySubscription?.remove();
      } catch (error) {
        Log?.debug('BLE manager reset notify subscription removal failed:', error);
      }
      cachedTransport.notifySubscription = undefined;
      this.rejectProtocolV2Frames(uuid, new Error(reason));
      try {
        this.emitDeviceDisconnect(
          uuid,
          cachedTransport.device?.name,
          cachedTransport.monitorToken ?? this.monitorTokens.get(uuid)
        );
      } catch (error) {
        Log?.debug('BLE manager reset disconnect event failed:', error);
      }
      delete transportCache[uuid];
    });
    this.protocolV2Links.invalidateAllLinks(reason).catch(error => {
      Log?.debug('[ReactNativeBleTransport] BLE manager link invalidation failed:', error);
    });
    this.deviceProtocol.clear();
    this.probingProtocols.clear();
    this.staleBondErrors.clear();
    this.acquiringProtocolV2.clear();
    this.sessionProtocols.clear();
    // Keep transport-lifetime V2 proof so the same endpoint can finish a no-probe
    // firmware reconnect after the native BLE manager is recreated.
    this.protocolReprobeFailures.clear();
    this.writeTimeoutCounts.clear();
    this.connectionSetupTimeoutCounts.clear();
    this.monitorTokens.clear();
    this.protocolV2Assemblers.clear();
    try {
      manager?.destroy();
    } catch (error) {
      Log?.debug('[ReactNativeBleTransport] BLE manager destroy failed (ignored):', error);
    }
  }

  private createProtocolMismatchError(expected: ProtocolType) {
    // A protocol probe miss alone does not prove that the OS bond is stale.
    // Native authentication/encryption failures are mapped separately.
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(
      HardwareErrorCode.BleTimeoutError,
      'Unable to detect BLE protocol: device did not respond to Protocol V1 GetFeatures or Protocol V2 Ping'
    );
  }

  private clearProbeProtocol(uuid: string, protocol: ProtocolType) {
    if (this.probingProtocols.get(uuid) === protocol) {
      this.probingProtocols.delete(uuid);
    }
    if (this.deviceProtocol.get(uuid) === protocol) {
      this.deviceProtocol.delete(uuid);
    }
  }

  /** Protocol to route a call with: confirmed if known, otherwise the one being probed. */
  private getActiveProtocol(uuid: string): ProtocolType | undefined {
    return this.deviceProtocol.get(uuid) ?? this.probingProtocols.get(uuid);
  }

  private async detectProtocol(
    uuid: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType,
    rebuildTransport?: () => Promise<void>
  ): Promise<ProtocolType> {
    // A declared V1 is taken at face value on every platform, as iOS has done
    // since protocol probing arrived: the caller reads the protocol off its own
    // device record, so the probe re-asks a question that is already answered
    // and costs a round trip on every acquire. Expected V2 must still Ping so
    // USB-priority `link disabled` surfaces here instead of as a later unmapped
    // RuntimeError. sessionProtocols is deliberately NOT stamped here: that map
    // records protocols the device actually answered on (it gates the
    // trustSessionProtocol narrowing in forced detection), and this branch has
    // received no response. skipProtocolProbe does not need it either — its only
    // caller is the V2 firmware-install reconnect.
    if (expectedProtocol === 'V1') {
      this.deviceProtocol.set(uuid, 'V1');
      Log?.debug('[ReactNativeBleTransport] protocol selected', {
        deviceId: uuid,
        protocol: 'V1',
        source: 'expected',
      });
      return 'V1';
    }

    if (expectedProtocol === 'V2' || this.acquiringProtocolV2.has(uuid)) {
      this.throwIfStaleBondError(uuid);
    }

    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(uuid)) {
        this.deviceProtocol.set(uuid, 'V2');
        this.sessionProtocols.set(uuid, 'V2');
        this.confirmedProtocolV2.add(uuid);
        Log?.debug('[ReactNativeBleTransport] protocol detected', {
          deviceId: uuid,
          protocol: 'V2',
          source: 'expected',
        });
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    // Protocol must be actively probed after connection. Name, PID, and descriptors only
    // influence probe order; a V2 hint probes V2 first and falls back to V1.
    const sessionProtocol = this.sessionProtocols.get(uuid);
    const reprobeFailures = this.protocolReprobeFailures.get(uuid) ?? 0;
    const fullProbeOrder: ProtocolType[] =
      protocolHint === 'V2' || this.deviceProtocol.get(uuid) === 'V2' ? ['V2', 'V1'] : ['V1', 'V2'];
    // A device that already answered on a protocol in this session keeps answering on
    // it; while it is rebooting nothing answers at all, so probing the other protocol
    // only adds its timeout to every poll.
    const trustSessionProtocol =
      sessionProtocol !== undefined &&
      !protocolHint &&
      reprobeFailures < PROTOCOL_REPROBE_FALLBACK_ATTEMPTS;
    const probeOrder: ProtocolType[] = trustSessionProtocol ? [sessionProtocol] : fullProbeOrder;

    for (let i = 0; i < probeOrder.length; i += 1) {
      const protocol = probeOrder[i];
      if (i > 0) {
        // Reset subscriptions and buffers after a failed probe before trying another protocol.
        await this.resetProbeStateAfterProtocolProbe(uuid, probeOrder[i - 1]);
        if (!transportCache[uuid]) {
          if (!rebuildTransport) {
            throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
          }
          await rebuildTransport();
        }
      }
      const detected =
        protocol === 'V1' ? await this.probeProtocolV1(uuid) : await this.probeProtocolV2(uuid);
      if (detected) {
        this.deviceProtocol.set(uuid, protocol);
        this.sessionProtocols.set(uuid, protocol);
        if (protocol === 'V2') {
          this.confirmedProtocolV2.add(uuid);
        }
        this.protocolReprobeFailures.delete(uuid);
        Log?.debug('[ReactNativeBleTransport] protocol detected', {
          deviceId: uuid,
          protocol,
          source: 'probe',
        });
        return protocol;
      }
    }

    if (trustSessionProtocol) {
      // Still silent on its own protocol: count it, and let the streak expire the
      // shortcut so a device that genuinely switched protocols is found again.
      this.protocolReprobeFailures.set(uuid, reprobeFailures + 1);
    } else {
      this.protocolReprobeFailures.delete(uuid);
    }

    this.deviceProtocol.delete(uuid);
    this.probingProtocols.delete(uuid);
    throw this.createProtocolDetectionError();
  }

  private async resetProbeStateAfterProtocolProbe(uuid: string, protocol: ProtocolType) {
    const transport = transportCache[uuid];
    await this.protocolV2Links.invalidateLink(
      uuid,
      `Reset notify state after Protocol ${protocol} probe`
    );
    this.protocolV2Assemblers.get(uuid)?.reset();
    this.resetProtocolV2Frames(uuid);
    if (this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
    }

    if (!transport) return;

    const previousNotifyTransactionId = transport.notifyTransactionId;
    if (this.monitorTokens.get(uuid) === transport.monitorToken) {
      this.monitorTokens.delete(uuid);
    }
    transport.notifySubscription?.remove();
    transport.notifySubscription = undefined;
    if (previousNotifyTransactionId) {
      try {
        await this.blePlxManager?.cancelTransaction(previousNotifyTransactionId);
      } catch (error) {
        Log?.debug(
          `[ReactNativeBleTransport] cancel notify after Protocol ${protocol} probe failed:`,
          error?.message || error
        );
      }
    }

    const monitorToken = this.nextMonitorToken;
    this.nextMonitorToken += 1;
    const notifyTransactionId = `${uuid}:notify:${monitorToken}`;
    transport.monitorToken = monitorToken;
    transport.notifyTransactionId = notifyTransactionId;
    this.monitorTokens.set(uuid, monitorToken);
    transport.notifySubscription = this._monitorCharacteristic(
      transport.notifyCharacteristic,
      uuid,
      monitorToken,
      notifyTransactionId
    );
    if (Platform.OS === 'ios') {
      await new Promise<void>(resolve => {
        setTimeout(resolve, IOS_NOTIFY_READY_DELAY_MS);
      });
    }
  }

  private async probeProtocolV1(uuid: string) {
    if (!this._messages) {
      return false;
    }

    try {
      this.probingProtocols.set(uuid, 'V1');
      // GetFeatures identifies Protocol V1 without resetting an existing wallet
      // session before Core has a chance to restore a hidden wallet.
      await this.callProtocolV1(uuid, 'GetFeatures', {}, { timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS });
      this.probingProtocols.delete(uuid);
      return true;
    } catch (error) {
      this.clearProbeProtocol(uuid, 'V1');
      Log?.debug('[ReactNativeBleTransport] Protocol V1 GetFeatures probe failed:', error);
      // A wedged write already dropped the link, so probing another protocol on it
      // would only fail against a torn-down transport: surface the real cause.
      if (isWedgedWriteError(error)) {
        throw error;
      }
      return false;
    }
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    this.probingProtocols.set(uuid, 'V2');
    this.protocolV2Assemblers.get(uuid)?.reset();
    this.throwIfStaleBondError(uuid);
    const detected = await probeProtocolV2Helper({
      call: (name: string, data: Record<string, unknown>, options?: TransportCallOptions) =>
        this.callProtocolV2(uuid, name, data, options),
      timeoutMs: PROTOCOL_V2_PROBE_TIMEOUT_MS,
      logger: Log,
      logPrefix: 'ProtocolV2 RN-BLE',
      onProbeFailed: () => {
        this.protocolV2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames(uuid);
      },
      shouldRethrow: isBleStaleBondHardwareError,
    });
    if (!detected) {
      this.clearProbeProtocol(uuid, 'V2');
    } else {
      this.probingProtocols.delete(uuid);
    }
    return detected;
  }

  private handleProtocolV2Notification(uuid: string, monitorToken: number, data: Uint8Array) {
    try {
      if (this.monitorTokens.get(uuid) !== monitorToken) return;

      if (data.length === 0) return;

      const assembler = this.protocolV2Assemblers.get(uuid);
      if (!assembler) return;

      for (const frameData of assembler.drain(data)) {
        this.resolveProtocolV2Frame(uuid, frameData);
      }
    } catch (error) {
      Log?.debug('[ReactNativeBleTransport] Protocol V2 notification error:', error);
      const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
      this.rejectProtocolV2Frames(uuid, notifyError);
      this.protocolV2Links
        .invalidateLink(uuid, `Protocol V2 notification error: ${error}`)
        .catch(invalidateError =>
          Log?.debug(
            '[ReactNativeBleTransport] Protocol V2 notify cleanup failed:',
            invalidateError
          )
        );
    }
  }

  private getProtocolV2FrameQueue(uuid: string) {
    let queue = this.protocolV2FrameQueues.get(uuid);
    if (!queue) {
      queue = [];
      this.protocolV2FrameQueues.set(uuid, queue);
    }
    return queue;
  }

  private resolveProtocolV2Frame(uuid: string, frame: Uint8Array) {
    const framePromise = this.protocolV2FramePromises.get(uuid);
    if (framePromise) {
      framePromise.resolve(frame);
      this.protocolV2FramePromises.delete(uuid);
      return;
    }
    this.getProtocolV2FrameQueue(uuid).push(frame);
  }

  private resetProtocolV2Frames(uuid: string) {
    this.rejectProtocolV2Frames(uuid, new Error(`Protocol V2 frame state reset for ${uuid}`));
  }

  private rejectProtocolV2Frames(uuid: string, error: Error) {
    this.protocolV2FrameQueues.delete(uuid);
    const framePromise = this.protocolV2FramePromises.get(uuid);
    if (framePromise) {
      this.protocolV2FramePromises.delete(uuid);
      framePromise.reject(error);
    }
  }

  private rememberStaleBondError(uuid: string, error: Error) {
    this.staleBondErrors.set(uuid, error);
    this.rejectProtocolV2Frames(uuid, error);
    if (this.runPromise && this.runPromiseDeviceId === uuid) {
      this.runPromise.reject(error);
    }
  }

  private throwIfStaleBondError(uuid: string) {
    const error = this.staleBondErrors.get(uuid);
    if (error) {
      throw error;
    }
  }

  private async readProtocolV2Frame(uuid: string) {
    const queuedFrame = this.getProtocolV2FrameQueue(uuid).shift();
    if (queuedFrame) {
      return queuedFrame;
    }

    const framePromise = createDeferred<Uint8Array>();
    this.protocolV2FramePromises.set(uuid, framePromise);
    try {
      return await framePromise.promise;
    } finally {
      if (this.protocolV2FramePromises.get(uuid) === framePromise) {
        this.protocolV2FramePromises.delete(uuid);
      }
    }
  }

  private async writeProtocolV2Packet(
    uuid: string,
    transport: BleTransport,
    base64: string,
    context: ProtocolV2CallContext,
    assertCurrentGeneration: () => void
  ) {
    const shouldUseWriteWithResponse = shouldWriteProtocolV2WithResponse({
      platform: Platform.OS,
      highThroughput: context.highThroughput,
      requestedWithResponse: context.writeWithResponse,
      characteristic: transport.writeCharacteristic,
    });
    let attempt = 0;
    for (;;) {
      assertCurrentGeneration();
      if (context.signal.aborted) {
        throw new Error(`Protocol V2 BLE write aborted for ${context.messageName}`);
      }
      try {
        await this.writeBlePacket(
          uuid,
          base64,
          payload =>
            shouldUseWriteWithResponse
              ? transport.writeCharacteristic.writeWithResponse(payload)
              : transport.writeCharacteristic.writeWithoutResponse(payload),
          // Same rule as Protocol V1: a write from a superseded generation must not
          // tear down the link that the current generation is using.
          () => {
            try {
              assertCurrentGeneration();
              return !context.signal.aborted;
            } catch {
              return false;
            }
          }
        );
        assertCurrentGeneration();
        return;
      } catch (error) {
        if (isNativeBleStaleBondError(error) || isBleStaleBondHardwareError(error)) {
          const bondError = toBleStaleBondHardwareError(error);
          this.rememberStaleBondError(uuid, bondError);
          throw bondError;
        }
        if (
          getFirmwareUploadWriteRetryType(error) !== 'congested' ||
          attempt >= FIRMWARE_UPLOAD_WRITE_MAX_RETRIES
        ) {
          throw error;
        }
        const delayMs = resolveFirmwareUploadRetryDelay(attempt);
        attempt += 1;
        Log?.debug('[ReactNativeBleTransport] Protocol V2 congested write retry:', {
          name: context.messageName,
          attempt,
          delayMs,
        });
        await delay(delayMs);
      }
    }
  }

  private async writeProtocolV2Frame(
    uuid: string,
    transport: BleTransport,
    frame: Uint8Array,
    context: ProtocolV2CallContext,
    assertCurrentGeneration: () => void
  ) {
    const tuning = getProtocolV2BleTuning();
    const packetCapacity = resolveProtocolV2PacketCapacity({
      platform: Platform.OS,
      iosPacketLength: tuning.iosPacketLength,
      androidPacketLength: tuning.androidPacketLength,
      mtu: transport.mtuSize,
    });
    await writeProtocolV2BleFrame({
      frame,
      packetCapacity,
      assertActive: assertCurrentGeneration,
      signal: context.signal,
      abortMessage: `Protocol V2 BLE write aborted for ${context.messageName}`,
      wait: delay,
      writePacket: packet =>
        this.writeProtocolV2Packet(
          uuid,
          transport,
          Buffer.from(packet).toString('base64'),
          context,
          assertCurrentGeneration
        ),
    });
  }

  private async callProtocolV2(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages || !this._messagesV2) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const callOptions = options;
    const highThroughputWrite = isProtocolV2HighThroughputCall(name);

    if (highThroughputWrite) {
      await this.ensureProtocolV2HighThroughputMtu(uuid);
      const tuning = getProtocolV2BleTuning();
      const currentTransport = this.getCachedTransport(uuid);
      const writeWithResponse = shouldWriteProtocolV2WithResponse({
        platform: Platform.OS,
        highThroughput: true,
        requestedWithResponse: options?.writeWithResponse,
        characteristic: currentTransport.writeCharacteristic,
      });
      const packetCapacity = resolveProtocolV2PacketCapacity({
        platform: Platform.OS,
        iosPacketLength: tuning.iosPacketLength,
        androidPacketLength: tuning.androidPacketLength,
        mtu: currentTransport.mtuSize,
      });
      const writeMode = writeWithResponse ? 'withResponse' : 'withoutResponse';
      const logSignature = `${name}:${writeMode}:${String(
        currentTransport.mtuSize
      )}:${packetCapacity}`;
      const loggedSignatures =
        this.protocolV2HighVolumeLogSignatures.get(uuid) ?? new Set<string>();
      if (!loggedSignatures.has(logSignature)) {
        loggedSignatures.add(logSignature);
        this.protocolV2HighVolumeLogSignatures.set(uuid, loggedSignatures);
        Log?.debug('[ReactNativeBleTransport] Protocol V2 high-volume write configured', {
          name,
          writeMode,
          reportedMtu: currentTransport.mtuSize,
          packetCapacity,
        });
      }
    }

    if (highThroughputWrite) {
      await this.enableAndroidHighConnectionPriority(uuid);
    }

    try {
      return await this.protocolV2Links.call(
        uuid,
        () => this.createProtocolV2Adapter(uuid),
        name,
        data,
        callOptions
      );
    } catch (e) {
      Log?.error('[ReactNativeBleTransport] Protocol V2 call error:', e);
      throw e;
    } finally {
      if (highThroughputWrite) {
        this.scheduleAndroidBalancedConnectionPriority(uuid);
      }
    }
  }

  private async ensureProtocolV2HighThroughputMtu(uuid: string) {
    const transport = this.getCachedTransport(uuid);
    if (!shouldRefreshNegotiatedMtu(transport.mtuSize)) return;

    const refreshedDevice = await requestNegotiatedMtu(transport.device, 'highThroughput', 1);
    transport.device = refreshedDevice;
    transport.mtuSize =
      typeof refreshedDevice.mtu === 'number' ? refreshedDevice.mtu : transport.mtuSize;

    if (shouldRefreshNegotiatedMtu(transport.mtuSize)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.BleConnectedError,
        `Protocol V2 high-throughput BLE MTU unavailable: ${String(transport.mtuSize)}`
      );
    }
  }

  private clearAndroidPriorityResetTimer(uuid: string) {
    const timerId = this.androidPriorityResetTimers.get(uuid);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      this.androidPriorityResetTimers.delete(uuid);
    }
  }

  private async enableAndroidHighConnectionPriority(uuid: string) {
    if (Platform.OS !== 'android') return;

    this.clearAndroidPriorityResetTimer(uuid);
    if (this.androidHighPriorityDevices.has(uuid)) return;

    const transport = transportCache[uuid];
    if (!transport) return;

    try {
      transport.device = await transport.device.requestConnectionPriority(ConnectionPriority.High);
      this.androidHighPriorityDevices.add(uuid);
      Log?.debug('[ReactNativeBleTransport] Android BLE connection priority changed', {
        priority: 'high',
      });
    } catch (error) {
      Log?.debug('[ReactNativeBleTransport] Android BLE high priority request failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private scheduleAndroidBalancedConnectionPriority(uuid: string) {
    if (Platform.OS !== 'android' || !this.androidHighPriorityDevices.has(uuid)) return;

    this.clearAndroidPriorityResetTimer(uuid);
    const timerId = setTimeout(() => {
      this.androidPriorityResetTimers.delete(uuid);
      this.restoreAndroidConnectionPriority(uuid, transportCache[uuid]).catch(error =>
        Log?.debug('[ReactNativeBleTransport] Android BLE priority restore failed', error)
      );
    }, ANDROID_HIGH_PRIORITY_IDLE_MS);
    this.androidPriorityResetTimers.set(uuid, timerId);
  }

  private async restoreAndroidConnectionPriority(uuid: string, transport?: BleTransport) {
    this.clearAndroidPriorityResetTimer(uuid);
    if (Platform.OS !== 'android' || !this.androidHighPriorityDevices.delete(uuid) || !transport) {
      return;
    }

    try {
      transport.device = await transport.device.requestConnectionPriority(
        ConnectionPriority.Balanced
      );
      Log?.debug('[ReactNativeBleTransport] Android BLE connection priority changed', {
        priority: 'balanced',
      });
    } catch (error) {
      Log?.debug('[ReactNativeBleTransport] Android BLE balanced priority request failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private createProtocolV2Adapter(uuid: string) {
    const generation = this.monitorTokens.get(uuid) ?? 0;
    const assertCurrentGeneration = () => {
      if (this.monitorTokens.get(uuid) !== generation) {
        throw new Error(`Protocol V2 monitor generation changed for ${uuid}`);
      }
    };

    return {
      router: PROTOCOL_V2_CHANNEL_BLE_UART,
      maxFrameBytes: PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
      generation,
      prepareCall: () => {
        assertCurrentGeneration();
        this.protocolV2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames(uuid);
      },
      writeFrame: async (frame: Uint8Array, context: ProtocolV2CallContext) => {
        assertCurrentGeneration();
        const currentTransport = this.getCachedTransport(uuid);
        await this.writeProtocolV2Frame(
          uuid,
          currentTransport,
          frame,
          context,
          assertCurrentGeneration
        );
      },
      readFrame: async () => {
        assertCurrentGeneration();
        const rxFrame = await this.readProtocolV2Frame(uuid);
        if (!(rxFrame instanceof Uint8Array)) {
          throw new Error('Protocol V2 response is not Uint8Array');
        }
        return rxFrame;
      },
      reset: (reason: string) => {
        if (this.monitorTokens.get(uuid) !== generation) return;
        this.protocolV2Assemblers.get(uuid)?.reset();
        this.rejectProtocolV2Frames(uuid, new Error(reason));
      },
      logger: Log,
      logPrefix: 'ProtocolV2 RN-BLE',
      createTimeoutError: (messageName: string, timeout: number) =>
        ERRORS.TypedError(
          HardwareErrorCode.BleTimeoutError,
          `BLE response timeout after ${timeout}ms for ${messageName}`
        ),
    };
  }

  getProtocolType(path: string): ProtocolType | undefined {
    return this.getActiveProtocol(path);
  }
}
