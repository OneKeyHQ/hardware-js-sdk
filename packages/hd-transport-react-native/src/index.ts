import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
import {
  BleATTErrorCode,
  BleError,
  BleErrorCode,
  BleManager as BlePlxManager,
  ScanMode,
} from 'react-native-ble-plx';
import ByteBuffer from 'bytebuffer';
import transport, {
  LogBlockCommand,
  type OneKeyDeviceInfoBase,
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  type ProtocolType,
  ProtocolV2FrameAssembler,
  ProtocolV2LinkManager,
  type TransportCallOptions,
  probeProtocolV2 as probeProtocolV2Helper,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, createDeferred, isOnekeyDevice } from '@onekeyfe/hd-shared';

import { getConnectedDeviceIds, onDeviceBondState, pairDevice } from './BleManager';
import { hasWritableCapability, resolveProtocolV2PacketCapacity } from './bleStrategy';
import { subscribeBleOn } from './subscribeBleOn';
import {
  ANDROID_PACKET_LENGTH,
  IOS_PACKET_LENGTH,
  getBleUuidKey,
  getBluetoothServiceUuids,
  getInfosForServiceUuid,
  isSameBleUuid,
} from './constants';
import { isHeaderChunk } from './utils/validateNotify';
import BleTransport from './BleTransport';
import timer from './utils/timer';
import { bleLogger, setBleLogger } from './logger';
import { createTransportCallLog } from './transportLog';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';
import type EventEmitter from 'events';
import type { BleAcquireInput, TransportOptions } from './types';

const { check, ProtocolV1, parseConfigure } = transport;

const Log = bleLogger;

const transportCache: Record<string, BleTransport> = {};
const FIRMWARE_UPLOAD_WRITE_BURST_SIZE = Platform.OS === 'ios' ? 4 : 5;
const FIRMWARE_UPLOAD_WRITE_PAUSE_MS = Platform.OS === 'ios' ? 8 : 10;
const FIRMWARE_UPLOAD_WRITE_FLUSH_DELAY_MS = Platform.OS === 'ios' ? 24 : 30;
const FIRMWARE_UPLOAD_WRITE_MAX_RETRIES = 8;
const FIRMWARE_UPLOAD_RECONNECT_RETRY_DELAY_MS = 2000;
const ANDROID_FIRMWARE_UPLOAD_PACKET_LENGTH = 192;
const FIRMWARE_UPLOAD_WRITE_PACKET_CAPACITY =
  Platform.OS === 'ios' ? IOS_PACKET_LENGTH : ANDROID_FIRMWARE_UPLOAD_PACKET_LENGTH;
const ANDROID_GATT_CONGESTED_STATUS = 143;

type FirmwareUploadWriteRetryType = 'congested' | 'reconnectable';
type ResolvedBleCharacteristics = {
  writeCharacteristic: Characteristic;
  notifyCharacteristic: Characteristic;
};

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

const getFirmwareUploadWriteRetryType = (error: unknown): FirmwareUploadWriteRetryType | null => {
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
    bleWriteError.errorCode === BleErrorCode.DeviceDisconnected ||
    bleWriteError.errorCode === BleErrorCode.CharacteristicNotFound
  ) {
    return 'reconnectable';
  }

  if (
    bleWriteError.androidErrorCode === ANDROID_GATT_CONGESTED_STATUS ||
    bleWriteError.status === ANDROID_GATT_CONGESTED_STATUS
  ) {
    return 'congested';
  }

  const text = [bleWriteError.reason, bleWriteError.message, bleWriteError.name]
    .filter(value => typeof value === 'string')
    .join(' ');
  return /GATT_CONGESTED|status\s*[:=]?\s*143/.test(text) ? 'congested' : null;
};

const resolveFirmwareUploadRetryDelay = (attempt: number, baseDelayMs = 200, maxDelayMs = 1200) =>
  Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
const BLE_RESPONSE_TIMEOUT_MS = 30_000;
const PROTOCOL_PROBE_TIMEOUT_MS = 1000;
const PROTOCOL_V2_PROBE_TIMEOUT_MS = 10_000;
const DEVICE_SCAN_TIMEOUT_MS = 8000;
const IOS_NOTIFY_READY_DELAY_MS = 150;
const ANDROID_NOTIFY_READY_DELAY_MS = 300;
export type ProtocolV2BleTuning = {
  iosPacketLength?: number;
  androidPacketLength?: number;
};

type ResolvedProtocolV2BleTuning = Required<ProtocolV2BleTuning>;

const DEFAULT_PROTOCOL_V2_BLE_TUNING: ResolvedProtocolV2BleTuning = {
  iosPacketLength: IOS_PACKET_LENGTH,
  androidPacketLength: ANDROID_PACKET_LENGTH,
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

function inferProtocolHintFromDeviceName(name?: string | null): ProtocolType | undefined {
  return /\bpro\s*2\b/i.test(name ?? '') ? 'V2' : undefined;
}

function getDeviceDisplayName(device?: Device | null) {
  return device?.name || device?.localName || null;
}

function isGenericBleService(uuid?: string | null) {
  return ['1800', '1801', '180a'].includes(getBleUuidKey(uuid));
}

function hasKnownOneKeyService(device?: Device | null) {
  return (device?.serviceUUIDs ?? []).some(serviceUuid =>
    getInfosForServiceUuid(serviceUuid, 'classic')
  );
}

const ANDROID_REQUEST_MTU = 256;

const connectOptions: Record<string, unknown> = {
  requestMTU: ANDROID_REQUEST_MTU,
  timeout: 3000,
  refreshGatt: 'OnConnected',
};

export type IOneKeyDevice = OneKeyDeviceInfoBase & Device;

const tryToGetConfiguration = (device: Device) => {
  if (!device || !device.serviceUUIDs) return null;
  const serviceUUID = device.serviceUUIDs.find(uuid => getInfosForServiceUuid(uuid, 'classic'));
  if (!serviceUUID) return null;
  const infos = getInfosForServiceUuid(serviceUUID, 'classic');
  if (!infos) return null;
  return infos;
};

const requestAndroidMtu = async (device: Device) => {
  if (Platform.OS !== 'android') return device;

  try {
    const mtuDevice = await device.requestMTU(ANDROID_REQUEST_MTU);
    Log?.debug('[ReactNativeBleTransport] MTU configured', {
      deviceId: device.id,
      requested: ANDROID_REQUEST_MTU,
      actual: mtuDevice.mtu,
    });
    return mtuDevice;
  } catch (error) {
    Log?.debug('[ReactNativeBleTransport] Android MTU request failed:', error);
    return device;
  }
};

type IOBleErrorRemap = Error | BleError | null | undefined;

function remapError(error: IOBleErrorRemap) {
  if (error instanceof BleError) {
    if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      error.iosErrorCode === BleATTErrorCode.UnlikelyError ||
      error.reason === 'Peer removed pairing information'
    ) {
      throw ERRORS.TypedError(HardwareErrorCode.BlePeerRemovedPairingInformation);
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

  name = 'ReactNativeBleTransport';

  configured = false;

  stopped = false;

  scanTimeout = DEVICE_SCAN_TIMEOUT_MS;

  runPromise: Deferred<any> | null = null;

  emitter?: EventEmitter;

  firmwareUploadWriteRecoveryIds = new Set<string>();

  /** Per-device protocol type detected by active wire-level probe after connect. */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

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
        await this.release(uuid, true);
      }
    },
  });

  private monitorTokens: Map<string, number> = new Map();

  private nextMonitorToken = 1;

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
    this._messagesV2 = parseConfigure(signedData);
    this.protocolV2Links
      .invalidateAllLinks('Protocol V2 schema reconfigured')
      .catch(error => Log?.debug('Protocol V2 schema link cleanup failed:', error));
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

    let fallbackServiceUuid: string | undefined;

    if (!infos) {
      const services = await device.services();
      Log?.debug(
        '[ReactNativeBleTransport] Known OneKey service UUID not found, discovered services:',
        services?.map(service => service.uuid)
      );

      const knownService = services.find(service =>
        getInfosForServiceUuid(service.uuid, 'classic')
      );
      const fallbackService =
        knownService ?? services.find(service => !isGenericBleService(service.uuid)) ?? services[0];

      if (fallbackService) {
        fallbackServiceUuid = fallbackService.uuid;
        characteristics = await device.characteristicsForService(fallbackService.uuid);
        Log?.debug('[ReactNativeBleTransport] Using fallback BLE service:', fallbackService.uuid);
      }
    }

    if (!infos && !fallbackServiceUuid) {
      try {
        Log?.debug('cancel connection when service not found');
        await device.cancelConnection();
      } catch (e) {
        Log?.debug('cancel connection error when service not found: ', e.message || e.reason);
      }
      throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound);
    }

    const serviceUuid = infos?.serviceUuid ?? fallbackServiceUuid;
    const writeUuid = infos?.writeUuid ?? '00000002-0000-1000-8000-00805f9b34fb';
    const notifyUuid = infos?.notifyUuid ?? '00000003-0000-1000-8000-00805f9b34fb';

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
    transport.disconnectSubscription = device.onDisconnected(() => {
      if (this.firmwareUploadWriteRecoveryIds.has(uuid)) {
        Log?.debug('device disconnect ignored during FirmwareUpload write recovery: ', uuid);
        return;
      }
      if (transportCache[uuid] !== transport) {
        Log?.debug('device disconnect ignored for stale transport: ', device?.id);
        return;
      }

      try {
        Log?.debug('device disconnect: ', device?.id);
        this.emitter?.emit('device-disconnect', {
          name: device?.name,
          id: device?.id,
          connectId: device?.id,
        });
        if (this.runPromise) {
          const error = ERRORS.TypedError(HardwareErrorCode.BleConnectedError);
          this.runPromise.reject(error);
          this.rejectAllProtocolV2Frames(error);
        }
      } catch (e) {
        Log?.debug('device disconnect error: ', e);
      } finally {
        this.release(uuid, true);
      }
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
          device = await device.connect(connectOptions);
        } catch (e) {
          if (
            e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
            e.errorCode === BleErrorCode.OperationCancelled
          ) {
            device = await device.connect();
          } else if (e.errorCode !== BleErrorCode.DeviceAlreadyConnected) {
            throw e;
          }
        }
      }

      const { writeCharacteristic, notifyCharacteristic } = await this.resolveCharacteristics(
        device
      );

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
          const isOneKey =
            isOnekeyDevice(device?.name ?? null, device?.id) ||
            isOnekeyDevice(device?.localName ?? null, device?.id) ||
            hasKnownOneKeyService(device);
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
            const { serviceUUIDs } = device as { serviceUUIDs?: string[] };
            const hasCachedServiceUuid = Boolean(serviceUUIDs?.length);
            const keepDevice = Platform.OS === 'ios' || hasCachedServiceUuid;
            if (keepDevice) {
              addDevice(device as unknown as Device);
            }
          }
        }
      );

      const addDevice = (device: Device) => {
        if (deviceList.every(d => d.id !== device.id)) {
          const displayName = getDeviceDisplayName(device) ?? 'Unknown BLE Device';
          const protocolHint = inferProtocolHintFromDeviceName(displayName);
          if (protocolHint) {
            this.deviceProtocolHints.set(device.id, protocolHint);
          }
          deviceList.push({
            ...device,
            name: displayName,
            commType: 'ble',
          } as IOneKeyDevice);
          Log?.debug('[ReactNativeBleTransport] OneKey BLE device discovered', {
            deviceId: device.id,
            name: displayName,
            serviceUUIDs: device.serviceUUIDs,
            protocolHint,
          });
        }
      };

      timer.timeout(() => {
        blePlxManager.stopDeviceScan();
        resolve(deviceList);
      }, this.scanTimeout);
    });
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise, expectedProtocol } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    const cachedTransport = transportCache[uuid];
    if (cachedTransport) {
      const cachedProtocol = this.deviceProtocol.get(uuid);
      const isCachedDeviceConnected = await cachedTransport.device.isConnected().catch(() => false);
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
      await this.release(uuid, true);
    }

    let device: Device | null = null;

    if (forceCleanRunPromise && this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.rejectAllProtocolV2Frames(error);
      this.runPromise = null;
      Log?.debug('Force clean Bluetooth run promise, forceCleanRunPromise: ', forceCleanRunPromise);
    }

    const blePlxManager = await this.getPlxManager();
    try {
      await subscribeBleOn(blePlxManager);
    } catch (error) {
      Log?.debug('subscribeBleOn error: ', error);
      throw error;
    }

    if (Platform.OS === 'android') {
      const bondState = await pairDevice(uuid);
      if (bondState.bonding) {
        await onDeviceBondState(uuid);
      } else if (!bondState.bonded) {
        throw ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'device is not bonded');
      }
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
        device = await blePlxManager.connectToDevice(uuid, connectOptions);
      } catch (e) {
        Log?.debug('try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          Log?.debug('first try to reconnect without params');
          device = await blePlxManager.connectToDevice(uuid);
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

      try {
        device = await device.connect(connectOptions);
      } catch (e) {
        Log?.debug('not connected, try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          Log?.debug('second try to reconnect without params');
          try {
            device = await device.connect();
          } catch (e) {
            Log?.debug('last try to reconnect error: ', e);
            // last try to reconnect device if this issue exists
            // https://github.com/dotintent/react-native-ble-plx/issues/426
            if (e.errorCode === BleErrorCode.OperationCancelled) {
              Log?.debug('last try to reconnect');
              await device.cancelConnection();
              device = await device.connect();
            }
          }
        } else {
          remapError(e);
        }
      }
    }

    device = await requestAndroidMtu(device);
    const { writeCharacteristic, notifyCharacteristic } = await this.resolveCharacteristics(device);

    const protocolHint = expectedProtocol
      ? undefined
      : this.deviceProtocolHints.get(uuid) ??
        inferProtocolHintFromDeviceName(getDeviceDisplayName(device));

    // release transport before new transport instance
    await this.release(uuid, true);
    if (protocolHint) {
      this.deviceProtocolHints.set(uuid, protocolHint);
    }

    const transport = new BleTransport(device, writeCharacteristic, notifyCharacteristic);
    if (Platform.OS === 'android') {
      transport.mtuSize = typeof device.mtu === 'number' ? device.mtu : transport.mtuSize;
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
    transportCache[uuid] = transport;

    this.protocolV2Assemblers.set(uuid, new ProtocolV2FrameAssembler());

    if (Platform.OS === 'ios') {
      await new Promise<void>(resolve => {
        setTimeout(resolve, IOS_NOTIFY_READY_DELAY_MS);
      });
    } else if (Platform.OS === 'android') {
      await delay(ANDROID_NOTIFY_READY_DELAY_MS);
    }

    const protocolType = await this.detectProtocol(uuid, expectedProtocol, protocolHint);

    this.emitter?.emit('device-connect', {
      name: device.name,
      id: device.id,
      connectId: device.id,
    });

    this.attachDisconnectSubscription(transport, device, uuid);

    return { uuid, protocolType };
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
        if (this.deviceProtocol.get(uuid) === 'V2') {
          let errorCode:
            | typeof HardwareErrorCode.BleDeviceBondError
            | typeof HardwareErrorCode.BleCharacteristicNotifyError
            | typeof HardwareErrorCode.BleCharacteristicNotifyChangeFailure
            | typeof HardwareErrorCode.BleTimeoutError =
            HardwareErrorCode.BleCharacteristicNotifyError;
          if (error.reason?.includes('The connection has timed out unexpectedly')) {
            errorCode = HardwareErrorCode.BleTimeoutError;
          } else if (error.reason?.includes('Encryption is insufficient')) {
            errorCode = HardwareErrorCode.BleDeviceBondError;
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
        if (this.runPromise) {
          let ERROR:
            | typeof HardwareErrorCode.BleDeviceBondError
            | typeof HardwareErrorCode.BleCharacteristicNotifyError
            | typeof HardwareErrorCode.BleTimeoutError =
            HardwareErrorCode.BleCharacteristicNotifyError;
          if (error.reason?.includes('The connection has timed out unexpectedly')) {
            ERROR = HardwareErrorCode.BleTimeoutError;
          }
          if (error.reason?.includes('Encryption is insufficient')) {
            ERROR = HardwareErrorCode.BleDeviceBondError;
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
            this.rejectAllProtocolV2Frames(notifyError);
            Log?.debug(
              `${HardwareErrorCode.BleCharacteristicNotifyChangeFailure} ${error.message}    ${error.reason}`
            );
            return;
          }
          const notifyError = ERRORS.TypedError(ERROR);
          this.runPromise.reject(notifyError);
          this.rejectAllProtocolV2Frames(notifyError);
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
        const protocol = this.deviceProtocol.get(uuid);
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
          this.runPromise?.resolve(value.toString('hex'));
        }
      } catch (error) {
        Log?.debug('monitor data error: ', error);
        const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
        if (this.deviceProtocol.get(uuid) === 'V2') {
          this.rejectProtocolV2Frames(uuid, notifyError);
        } else {
          this.runPromise?.reject(notifyError);
        }
      }
    }, notifyTransactionId);

    return subscription;
  }

  async release(uuid: string, onclose = false) {
    const transport = transportCache[uuid];
    await this.protocolV2Links.invalidateLink(uuid, 'React Native BLE transport released');
    if (this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
      this.rejectAllProtocolV2Frames(error);
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

      if (transport.notifyTransactionId) {
        try {
          await this.blePlxManager?.cancelTransaction(transport.notifyTransactionId);
        } catch (e) {
          Log?.debug('release: cancel notify transaction error (ignored): ', e?.message || e);
        }
      }

      delete transportCache[uuid];
    }

    this.deviceProtocol.delete(uuid);
    // 设备名称提示不依赖当前连接；保留它可让重连优先探测 V2。
    this.protocolV2Assemblers.get(uuid)?.reset();
    this.protocolV2Assemblers.delete(uuid);
    this.resetProtocolV2Frames(uuid);

    try {
      await this.blePlxManager?.cancelTransaction(uuid);
    } catch (e) {
      Log?.debug('release: cancel transaction error (ignored): ', e?.message || e);
    }

    return Promise.resolve(true);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
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
    Log?.debug('transport call', createTransportCallLog(name, protocol, data));

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
    this.runPromise = runPromise;
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
        data => transport.writeWithRetry(data),
        e => {
          this.runPromise = null;
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
              await transport.writeCharacteristic.writeWithoutResponse(data);
              return;
            } catch (error) {
              const retryType = getFirmwareUploadWriteRetryType(error);
              if (!retryType || attempt >= FIRMWARE_UPLOAD_WRITE_MAX_RETRIES) {
                throw error;
              }
              const shouldReconnect = retryType === 'reconnectable';
              const delayMs = shouldReconnect
                ? FIRMWARE_UPLOAD_RECONNECT_RETRY_DELAY_MS
                : resolveFirmwareUploadRetryDelay(attempt);
              Log?.debug('[ReactNativeBleTransport] FirmwareUpload write retry:', {
                attempt: attempt + 1,
                delayMs,
                reconnect: shouldReconnect,
                error,
              });
              if (shouldReconnect) {
                this.firmwareUploadWriteRecoveryIds.add(uuid);
              }
              await delay(delayMs);
              attempt += 1;
              if (shouldReconnect) {
                try {
                  await this.reconnectFirmwareUploadTransport(uuid, transport);
                } catch (e) {
                  Log?.debug('[ReactNativeBleTransport] FirmwareUpload reconnect error:', e);
                  if (attempt >= FIRMWARE_UPLOAD_WRITE_MAX_RETRIES) {
                    throw e;
                  }
                }
              }
            }
          }
        },
        e => {
          this.runPromise = null;
          Log?.error('writeCharacteristic write error: ', e);
        }
      );
    } else {
      for (const o of buffers) {
        const outData = o.toString('base64');
        // Upload resources on low-end phones may OOM
        try {
          await transport.writeCharacteristic.writeWithoutResponse(outData);
        } catch (e) {
          Log?.debug('writeCharacteristic write error: ', e);
          this.runPromise = null;
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
      if (name === 'Initialize' && options?.timeoutMs === PROTOCOL_PROBE_TIMEOUT_MS) {
        Log?.debug('[ReactNativeBleTransport] Protocol V1 Initialize probe call failed:', e);
      } else {
        Log?.error('call error: ', e);
      }
      throw e;
    } finally {
      if (timeout) clearTimeout(timeout);
      if (this.runPromise === runPromise) {
        this.runPromise = null;
      }
    }
  }

  stop() {
    this.stopped = true;
  }

  async disconnect(session: string) {
    await this.protocolV2Links.invalidateLink(session, 'React Native BLE transport disconnected');
    const transport = transportCache[session];

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

    // cancel the ble transaction
    if (session) {
      try {
        await this.blePlxManager?.cancelTransaction(session);
      } catch (e) {
        Log?.debug('resetSession: cancel transaction error (ignored): ', e?.message || e);
      }
    }

    // disconnect the device via the device object
    if (transport?.device) {
      try {
        await transport.device.cancelConnection();
      } catch (e) {
        Log?.debug('resetSession: device.cancelConnection error (ignored): ', e?.message || e);
      }
    }

    // disconnect the device via the ble manager
    try {
      await this.blePlxManager?.cancelDeviceConnection(session);
    } catch (e) {
      Log?.debug('resetSession: manager.cancelDeviceConnection error (ignored): ', e?.message || e);
    }

    // clear the transport cache
    if (transportCache[session]) {
      delete transportCache[session];
    }
    this.deviceProtocol.delete(session);
    this.deviceProtocolHints.delete(session);
    this.protocolV2Assemblers.delete(session);
    this.resetProtocolV2Frames(session);

    // emit the disconnect event
    try {
      this.emitter?.emit('device-disconnect', {
        name: transport?.device?.name,
        id: session,
        connectId: session,
      });
    } catch (e) {
      Log?.error('resetSession: emit disconnect event error: ', e);
    }
    // eslint-disable-next-line no-promise-executor-return
    await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
  }

  cancel() {
    Log?.debug('transport-react-native transport cancel');
    if (this.runPromise) {
      // this.runPromise.reject(new Error('Transport_CallCanceled'));
    }
    this.runPromise = null;
  }

  private getCachedTransport(uuid: string) {
    const transport = transportCache[uuid];
    if (!transport) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
    }
    return transport;
  }

  private createProtocolMismatchError(expected: ProtocolType) {
    return ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(
      HardwareErrorCode.BleTimeoutError,
      'Unable to detect BLE protocol: device did not respond to Protocol V1 Initialize or Protocol V2 Ping'
    );
  }

  private clearProbeProtocol(uuid: string, protocol: ProtocolType) {
    if (this.deviceProtocol.get(uuid) === protocol) {
      this.deviceProtocol.delete(uuid);
    }
  }

  private async detectProtocol(
    uuid: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType
  ): Promise<ProtocolType> {
    if (expectedProtocol === 'V1') {
      if (await this.probeProtocolV1(uuid)) {
        this.deviceProtocol.set(uuid, 'V1');
        Log?.debug('[ReactNativeBleTransport] protocol detected', {
          deviceId: uuid,
          protocol: 'V1',
          source: 'expected',
        });
        return 'V1';
      }
      throw this.createProtocolMismatchError(expectedProtocol);
    }

    if (expectedProtocol === 'V2') {
      // 免探测路径：调用方显式承诺该设备是 V2（例如固件升级重启后的重连场景，
      // 上层已经探测过协议并通过 expectedProtocol 传回），这里不再重复探测。
      this.deviceProtocol.set(uuid, 'V2');
      Log?.debug('[ReactNativeBleTransport] protocol detected', {
        deviceId: uuid,
        protocol: 'V2',
        source: 'expected',
      });
      return 'V2';
    }

    // 项目约束：协议判断必须在连接后主动探测，不能依赖设备名/PID/descriptor。
    // 设备名 hint（如 "Pro 2"）只用于调整探测顺序：hint=V2 时先探 V2、失败回落 V1，
    // 不能作为最终结论。
    const probeOrder: ProtocolType[] =
      protocolHint === 'V2' || this.deviceProtocol.get(uuid) === 'V2' ? ['V2', 'V1'] : ['V1', 'V2'];

    for (let i = 0; i < probeOrder.length; i += 1) {
      const protocol = probeOrder[i];
      if (i > 0) {
        // 上一个协议探测失败后，重置订阅与缓冲，避免残留数据干扰下一个协议的探测。
        await this.resetProbeStateAfterProtocolProbe(uuid, probeOrder[i - 1]);
      }
      const detected =
        protocol === 'V1' ? await this.probeProtocolV1(uuid) : await this.probeProtocolV2(uuid);
      if (detected) {
        this.deviceProtocol.set(uuid, protocol);
        Log?.debug('[ReactNativeBleTransport] protocol detected', {
          deviceId: uuid,
          protocol,
          source: 'probe',
        });
        return protocol;
      }
    }

    this.deviceProtocol.delete(uuid);
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
      this.deviceProtocol.set(uuid, 'V1');
      await this.callProtocolV1(uuid, 'Initialize', {}, { timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS });
      return true;
    } catch (error) {
      this.clearProbeProtocol(uuid, 'V1');
      Log?.debug('[ReactNativeBleTransport] Protocol V1 Initialize probe failed:', error);
      return false;
    }
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    this.deviceProtocol.set(uuid, 'V2');
    this.protocolV2Assemblers.get(uuid)?.reset();
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
    });
    if (!detected) {
      this.clearProbeProtocol(uuid, 'V2');
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

  private rejectAllProtocolV2Frames(error: Error) {
    this.protocolV2FrameQueues.clear();
    for (const framePromise of this.protocolV2FramePromises.values()) {
      framePromise.reject(error);
    }
    this.protocolV2FramePromises.clear();
  }

  private resetProtocolV2Frames(uuid: string) {
    this.protocolV2FrameQueues.delete(uuid);
    this.protocolV2FramePromises.delete(uuid);
  }

  private rejectProtocolV2Frames(uuid: string, error: Error) {
    this.protocolV2FrameQueues.delete(uuid);
    const framePromise = this.protocolV2FramePromises.get(uuid);
    if (framePromise) {
      this.protocolV2FramePromises.delete(uuid);
      framePromise.reject(error);
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

  private async writeProtocolV2Frame(transport: BleTransport, frame: Uint8Array) {
    const tuning = getProtocolV2BleTuning();
    const packetCapacity = resolveProtocolV2PacketCapacity({
      platform: Platform.OS,
      iosPacketLength: tuning.iosPacketLength,
      androidPacketLength: tuning.androidPacketLength,
      mtu: Platform.OS === 'android' ? transport.mtuSize : undefined,
    });
    for (let offset = 0; offset < frame.length; offset += packetCapacity) {
      const chunk = frame.slice(offset, offset + packetCapacity);
      const base64 = Buffer.from(chunk).toString('base64');
      await transport.writeCharacteristic.writeWithoutResponse(base64);
    }
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

    const callOptions = {
      ...options,
      timeoutMs: options?.timeoutMs ?? BLE_RESPONSE_TIMEOUT_MS,
    };
    const highVolumeWrite = LogBlockCommand.has(name);

    if (highVolumeWrite) {
      const tuning = getProtocolV2BleTuning();
      Log?.debug('[ReactNativeBleTransport] Protocol V2 high-volume write configured', {
        name,
        writeMode: 'withoutResponse',
        packetCapacity: Platform.OS === 'ios' ? tuning.iosPacketLength : tuning.androidPacketLength,
      });
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
      writeFrame: async (frame: Uint8Array) => {
        assertCurrentGeneration();
        const currentTransport = this.getCachedTransport(uuid);
        await this.writeProtocolV2Frame(currentTransport, frame);
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
    return this.deviceProtocol.get(path);
  }
}
