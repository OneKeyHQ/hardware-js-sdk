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
  COMMON_HEADER_SIZE,
  LogBlockCommand,
  type OneKeyDeviceInfoBase,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, createDeferred, isOnekeyDevice } from '@onekeyfe/hd-shared';
import { LoggerNames, getLogger } from '@onekeyfe/hd-core';

import { getConnectedDeviceIds, onDeviceBondState, pairDevice } from './BleManager';
import { subscribeBleOn } from './subscribeBleOn';
import {
  ANDROID_PACKET_LENGTH,
  IOS_PACKET_LENGTH,
  getBluetoothServiceUuids,
  getInfosForServiceUuid,
} from './constants';
import { isHeaderChunk } from './utils/validateNotify';
import BleTransport from './BleTransport';
import timer from './utils/timer';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';
import type EventEmitter from 'events';
import type { BleAcquireInput, TransportOptions } from './types';

const { check, buildBuffers, receiveOne, parseConfigure } = transport;

const Log = getLogger(LoggerNames.HdBleTransport);

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

const getBleIdentityName = (device?: { name?: string | null } | null): string | null => {
  const localName = (device as { localName?: string | null } | undefined)?.localName;
  return device?.name ?? localName ?? null;
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

let connectOptions: Record<string, unknown> = {
  requestMTU: 256,
  timeout: 3000,
  refreshGatt: 'OnConnected',
};

export type IOneKeyDevice = OneKeyDeviceInfoBase & Device;

const tryToGetConfiguration = (device: Device) => {
  if (!device || !device.serviceUUIDs) return null;
  const [serviceUUID] = device.serviceUUIDs;
  const infos = getInfosForServiceUuid(serviceUUID, 'classic');
  if (!infos) return null;
  return infos;
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

  name = 'ReactNativeBleTransport';

  configured = false;

  stopped = false;

  scanTimeout = 3000;

  runPromise: Deferred<any> | null = null;

  emitter?: EventEmitter;

  firmwareUploadWriteRecoveryIds = new Set<string>();

  constructor(options: TransportOptions) {
    this.scanTimeout = options.scanTimeout ?? 3000;
  }

  init(_logger: any, emitter: EventEmitter) {
    this.emitter = emitter;
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
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
      try {
        Log?.debug('cancel connection when service not found');
        await device.cancelConnection();
      } catch (e) {
        Log?.debug('cancel connection error when service not found: ', e.message || e.reason);
      }
      throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound);
    }

    const { serviceUuid, writeUuid, notifyUuid } = infos;

    if (!characteristics) {
      characteristics = await device.characteristicsForService(serviceUuid);
    }

    if (!characteristics) {
      throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound);
    }

    let writeCharacteristic;
    let notifyCharacteristic;
    for (const c of characteristics) {
      if (c.uuid === writeUuid) {
        writeCharacteristic = c;
      } else if (c.uuid === notifyUuid) {
        notifyCharacteristic = c;
      }
    }

    if (!writeCharacteristic) {
      throw ERRORS.TypedError('BLECharacteristicNotFound: write characteristic not found');
    }

    if (!notifyCharacteristic) {
      throw ERRORS.TypedError('BLECharacteristicNotFound: notify characteristic not found');
    }

    if (!writeCharacteristic.isWritableWithResponse) {
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

      try {
        Log?.debug('device disconnect: ', device?.id);
        this.emitter?.emit('device-disconnect', {
          name: device?.name,
          id: device?.id,
          connectId: device?.id,
        });
        if (this.runPromise) {
          this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError));
        }
      } catch (e) {
        Log?.debug('device disconnect error: ', e);
      } finally {
        this.release(uuid);
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
            connectOptions = {};
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
      transport.notifySubscription = this._monitorCharacteristic(notifyCharacteristic, uuid);
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
          scanMode: ScanMode.LowLatency,
        },
        (error, device) => {
          if (error) {
            Log?.debug('ble scan manager: ', blePlxManager);
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

          if (isOnekeyDevice(getBleIdentityName(device), device?.id)) {
            Log?.debug('search device start ======================');
            const { name, localName, id } = device ?? {};
            Log?.debug(
              `device name: ${name ?? ''}\nlocalName: ${localName ?? ''}\nid: ${id ?? ''}`
            );
            addDevice(device as unknown as Device);
            Log?.debug('search device end ======================\n');
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
              Log?.debug('search connected peripheral: ', device.id);
              addDevice(device as unknown as Device);
            }
          }
        }
      );

      const addDevice = (device: Device) => {
        if (deviceList.every(d => d.id !== device.id)) {
          deviceList.push({ ...device, commType: 'ble' } as IOneKeyDevice);
        }
      };

      timer.timeout(() => {
        blePlxManager.stopDeviceScan();
        resolve(deviceList);
      }, this.scanTimeout);
    });
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    let device: Device | null = null;

    if (transportCache[uuid]) {
      /**
       * If the transport is not released due to an exception operation
       * it will be handled again here
       */
      Log?.debug('transport not be released, will release: ', uuid);
      await this.release(uuid);
    }

    if (forceCleanRunPromise && this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
      Log?.debug('Force clean Bluetooth run promise, forceCleanRunPromise: ', forceCleanRunPromise);
    }

    const blePlxManager = await this.getPlxManager();
    try {
      await subscribeBleOn(blePlxManager);
    } catch (error) {
      Log?.debug('subscribeBleOn error: ', error);
      throw error;
    }

    // check device is bonded
    if (Platform.OS === 'android') {
      const bondState = await pairDevice(uuid);
      if (bondState.bonding) {
        await onDeviceBondState(uuid);
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
          connectOptions = {};
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
        await device.connect(connectOptions);
      } catch (e) {
        Log?.debug('not connected, try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          connectOptions = {};
          Log?.debug('second try to reconnect without params');
          try {
            await device.connect();
          } catch (e) {
            Log?.debug('last try to reconnect error: ', e);
            // last try to reconnect device if this issue exists
            // https://github.com/dotintent/react-native-ble-plx/issues/426
            if (e.errorCode === BleErrorCode.OperationCancelled) {
              Log?.debug('last try to reconnect');
              await device.cancelConnection();
              await device.connect();
            }
          }
        } else {
          remapError(e);
        }
      }
    }

    const { writeCharacteristic, notifyCharacteristic } = await this.resolveCharacteristics(device);

    // release transport before new transport instance
    await this.release(uuid);

    const transport = new BleTransport(device, writeCharacteristic, notifyCharacteristic);
    transport.notifySubscription = this._monitorCharacteristic(
      transport.notifyCharacteristic,
      uuid
    );
    transportCache[uuid] = transport;

    this.emitter?.emit('device-connect', {
      name: device.name,
      id: device.id,
      connectId: device.id,
    });

    this.attachDisconnectSubscription(transport, device, uuid);

    return { uuid };
  }

  _monitorCharacteristic(characteristic: Characteristic, uuid: string): Subscription {
    let bufferLength = 0;
    let buffer: any[] = [];
    const subscription = characteristic.monitor((error, c) => {
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
            this.runPromise.reject(
              ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotifyChangeFailure)
            );
            Log?.debug(
              `${HardwareErrorCode.BleCharacteristicNotifyChangeFailure} ${error.message}    ${error.reason}`
            );
            return;
          }
          this.runPromise.reject(ERRORS.TypedError(ERROR));
          Log?.debug(': monitor notify error, and has unreleased Promise', Error);
        }

        return;
      }

      if (!c) {
        throw ERRORS.TypedError(HardwareErrorCode.BleMonitorError);
      }

      try {
        const data = Buffer.from(c.value as string, 'base64');
        // console.log('[hd-transport-react-native] Received a packet, ', 'buffer: ', data);
        if (isHeaderChunk(data)) {
          bufferLength = data.readInt32BE(5);
          buffer = [...data.subarray(3)];
        } else {
          buffer = buffer.concat([...data]);
        }

        if (buffer.length - COMMON_HEADER_SIZE >= bufferLength) {
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
        this.runPromise?.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
    }, uuid);

    return subscription;
  }

  async release(uuid: string) {
    const transport = transportCache[uuid];

    if (transport) {
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

      delete transportCache[uuid];

      // Temporary close the Android disconnect after each request
      if (Platform.OS === 'android') {
        // await this.blePlxManager?.cancelDeviceConnection(uuid);
      }
    }

    return Promise.resolve(true);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    await this.call(session, name, data);
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this.stopped) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject(ERRORS.TypedError('Transport stopped.'));
    }
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';

    Log?.debug('transport-react-native call this.runPromise', this.runPromise);
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    const transport = transportCache[uuid];
    if (!transport) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
    }

    this.runPromise = createDeferred();
    const messages = this._messages;
    // Upload resources on low-end phones may OOM
    if (name === 'ResourceUpdate' || name === 'ResourceAck') {
      Log?.debug('transport-react-native', 'call-', ' name: ', name, ' data: ', {
        file_name: data?.file_name,
        hash: data?.hash,
      });
    } else if (LogBlockCommand.has(name)) {
      Log?.debug('transport-react-native', 'call-', ' name: ', name);
    } else {
      Log?.debug('transport-react-native', 'call-', ' name: ', name, ' data: ', data);
    }

    const buffers = buildBuffers(messages, name, data);

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
      Log?.debug('[ReactNativeBleTransport] FirmwareUpload write uses throttled BLE packets:', {
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
        // this.Log.debug('send hex strting: ', o.toString('hex'));
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
      const response = await this.runPromise.promise;

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      Log?.debug('receive data: ', response);
      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      Log?.error('call error: ', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }

  stop() {
    this.stopped = true;
  }

  async disconnect(session: string) {
    Log?.debug('transport-react-native transport resetSession: ', session);
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
}
