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
  PROTOCOL_V2_CHANNEL_BLE_UART,
  type ProtocolType,
  type TransportCallOptions,
  ProtocolV2FrameAssembler,
  ProtocolV2Session,
  probeProtocolV2,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, createDeferred, isOnekeyDevice } from '@onekeyfe/hd-shared';

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
import { bleLogger, setBleLogger } from './logger';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';
import type EventEmitter from 'events';
import type { BleAcquireInput, TransportOptions } from './types';

const { check, buildBuffers, receiveOne, parseConfigure } = transport;

const Log = bleLogger;

const transportCache: Record<string, BleTransport> = {};
const BLE_RESPONSE_TIMEOUT_MS = 30_000;
const PROTOCOL_PROBE_TIMEOUT_MS = 1500;

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

  _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ReactNativeBleTransport';

  configured = false;

  stopped = false;

  scanTimeout = 3000;

  runPromise: Deferred<any> | null = null;

  emitter?: EventEmitter;

  /** Per-device protocol type detected by active wire-level probe after connect. */
  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private protocolV2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  private protocolV2FrameQueue: Uint8Array[] = [];

  private protocolV2FramePromise: Deferred<Uint8Array> | null = null;

  constructor(options: TransportOptions) {
    this.scanTimeout = options.scanTimeout ?? 3000;
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
    Log?.debug('[ReactNativeBleTransport] Protocol V2 schema configured');
  }

  listen() {
    // empty
  }

  getPlxManager(): Promise<BlePlxManager> {
    if (this.blePlxManager) return Promise.resolve(this.blePlxManager);
    this.blePlxManager = new BlePlxManager();
    return Promise.resolve(this.blePlxManager);
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
        null,
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

          if (isOnekeyDevice(device?.name ?? null, device?.id)) {
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

      getConnectedDeviceIds(getBluetoothServiceUuids()).then(devices => {
        for (const device of devices) {
          Log?.debug('search connected peripheral: ', device.id);
          addDevice(device as unknown as Device);
        }
      });

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
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.rejectProtocolV2Frame(error);
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

    await device.discoverAllServicesAndCharacteristics();
    let infos = tryToGetConfiguration(device);
    let characteristics;

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

    // release transport before new transport instance
    await this.release(uuid);

    const transport = new BleTransport(device, writeCharacteristic, notifyCharacteristic);
    transport.notifySubscription = this._monitorCharacteristic(
      transport.notifyCharacteristic,
      uuid
    );
    transportCache[uuid] = transport;

    this.protocolV2Assemblers.set(uuid, new ProtocolV2FrameAssembler());

    const protocolType = await this.detectProtocol(uuid);

    this.emitter?.emit('device-connect', {
      name: device.name,
      id: device.id,
      connectId: device.id,
    });

    transport.disconnectSubscription = device.onDisconnected(() => {
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
          this.rejectProtocolV2Frame(error);
        }
      } catch (e) {
        Log?.debug('device disconnect error: ', e);
      } finally {
        this.release(uuid);
      }
    });

    return { uuid, protocolType };
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
            this.rejectProtocolV2Frame(notifyError);
            Log?.debug(
              `${HardwareErrorCode.BleCharacteristicNotifyChangeFailure} ${error.message}    ${error.reason}`
            );
            return;
          }
          const notifyError = ERRORS.TypedError(ERROR);
          this.runPromise.reject(notifyError);
          this.rejectProtocolV2Frame(notifyError);
          Log?.debug(': monitor notify error, and has unreleased Promise', Error);
        }

        return;
      }

      if (!c) {
        throw ERRORS.TypedError(HardwareErrorCode.BleMonitorError);
      }

      try {
        const data = Buffer.from(c.value as string, 'base64');
        if (this.deviceProtocol.get(uuid) === 'V2') {
          this.handleProtocolV2Notification(uuid, new Uint8Array(data));
          return;
        }
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
        const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
        this.runPromise?.reject(notifyError);
        this.rejectProtocolV2Frame(notifyError);
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
      this.deviceProtocol.delete(uuid);
      this.protocolV2Assemblers.delete(uuid);

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

    const forceRun = name === 'Initialize' || name === 'Cancel';

    Log?.debug('transport-react-native call this.runPromise', this.runPromise);
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    const protocol = this.getProtocolType(uuid);
    // Upload resources on low-end phones may OOM
    if (name === 'ResourceUpdate' || name === 'ResourceAck') {
      Log?.debug('transport-react-native', 'call-', ' name: ', name, ' data: ', {
        file_name: data?.file_name,
        hash: data?.hash,
      });
    } else if (LogBlockCommand.has(name)) {
      Log?.debug('transport-react-native', 'call-', ' name: ', name, ' protocol: ', protocol);
    } else {
      Log?.debug(
        'transport-react-native',
        'call-',
        ' name: ',
        name,
        ' data: ',
        data,
        ' protocol: ',
        protocol
      );
    }

    if (protocol === 'V2') {
      return this.callProtocolV2(uuid, name, data, options);
    }

    const transport = this.getCachedTransport(uuid);
    this.runPromise = createDeferred();
    const messages = this._messages;
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
      await writeChunkedData(
        buffers,
        async data => {
          await transport.writeCharacteristic.writeWithoutResponse(data);
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
    this.deviceProtocol.delete(session);
    this.protocolV2Assemblers.delete(session);

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

  private async detectProtocol(uuid: string): Promise<ProtocolType> {
    const protocol: ProtocolType = (await this.probeProtocolV2(uuid)) ? 'V2' : 'V1';
    this.deviceProtocol.set(uuid, protocol);
    Log?.debug(`[ReactNativeBleTransport] detectProtocol: uuid=${uuid} -> ${protocol}`);
    return protocol;
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    return probeProtocolV2({
      call: (name: string, data: Record<string, unknown>, options?: { timeoutMs?: number }) =>
        this.callProtocolV2(uuid, name, data, options),
      timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS,
      logger: Log,
      logPrefix: 'ReactNativeBleTransport',
      onBeforeProbe: () => {
        this.deviceProtocol.set(uuid, 'V2');
        this.protocolV2Assemblers.get(uuid)?.reset();
      },
      onProbeFailed: () => {
        this.protocolV2Assemblers.get(uuid)?.reset();
      },
    });
  }

  private handleProtocolV2Notification(uuid: string, data: Uint8Array) {
    try {
      if (!this.runPromise) {
        this.protocolV2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames();
        return;
      }

      if (data.length === 0) return;

      const assembler = this.protocolV2Assemblers.get(uuid);
      if (!assembler) return;

      let frameData = assembler.push(data);
      while (frameData) {
        this.resolveProtocolV2Frame(frameData);
        frameData = assembler.push(new Uint8Array(0));
      }
    } catch (error) {
      Log?.debug('[ReactNativeBleTransport] Protocol V2 notification error:', error);
      const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
      this.runPromise?.reject(notifyError);
      this.rejectProtocolV2Frame(notifyError);
    }
  }

  private resolveProtocolV2Frame(frame: Uint8Array) {
    if (this.protocolV2FramePromise) {
      this.protocolV2FramePromise.resolve(frame);
      this.protocolV2FramePromise = null;
      return;
    }
    this.protocolV2FrameQueue.push(frame);
  }

  private rejectProtocolV2Frame(error: Error) {
    this.protocolV2FrameQueue = [];
    if (this.protocolV2FramePromise) {
      this.protocolV2FramePromise.reject(error);
      this.protocolV2FramePromise = null;
    }
  }

  private resetProtocolV2Frames() {
    this.protocolV2FrameQueue = [];
    this.protocolV2FramePromise = null;
  }

  private async readProtocolV2Frame() {
    const queuedFrame = this.protocolV2FrameQueue.shift();
    if (queuedFrame) {
      return queuedFrame;
    }

    const framePromise = createDeferred<Uint8Array>();
    this.protocolV2FramePromise = framePromise;
    try {
      return await framePromise.promise;
    } finally {
      if (this.protocolV2FramePromise === framePromise) {
        this.protocolV2FramePromise = null;
      }
    }
  }

  private async writeProtocolV2Frame(transport: BleTransport, frame: Uint8Array) {
    const packetCapacity = Platform.OS === 'ios' ? IOS_PACKET_LENGTH : ANDROID_PACKET_LENGTH;

    for (let offset = 0; offset < frame.length; offset += packetCapacity) {
      const chunk = frame.slice(offset, offset + packetCapacity);
      await transport.writeCharacteristic.writeWithoutResponse(
        Buffer.from(chunk).toString('base64')
      );
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

    const forceRun = name === 'Initialize' || name === 'Cancel' || name === 'GetProtoVersion';
    if (this.runPromise) {
      if (!forceRun) {
        throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
      }
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.rejectProtocolV2Frame(error);
      this.runPromise = null;
    }

    const transport = this.getCachedTransport(uuid);
    const runPromise = createDeferred<Uint8Array>();
    runPromise.promise.catch(() => undefined);
    this.runPromise = runPromise;
    this.protocolV2Assemblers.get(uuid)?.reset();
    this.resetProtocolV2Frames();
    let completed = false;
    const callOptions = {
      ...options,
      timeoutMs: options?.timeoutMs ?? BLE_RESPONSE_TIMEOUT_MS,
    };

    try {
      const session = new ProtocolV2Session({
        schemas: {
          protocolV1: this._messages,
          protocolV2: this._messagesV2,
        },
        router: PROTOCOL_V2_CHANNEL_BLE_UART,
        writeFrame: (frame: Uint8Array) => this.writeProtocolV2Frame(transport, frame),
        readFrame: async () => {
          const rxFrame = await this.readProtocolV2Frame();
          if (!(rxFrame instanceof Uint8Array)) {
            throw new Error('Protocol V2 response is not Uint8Array');
          }
          return rxFrame;
        },
        logger: Log,
        logPrefix: 'ProtocolV2 RN-BLE',
        createTimeoutError: (_messageName: string, timeout: number) =>
          ERRORS.TypedError(
            HardwareErrorCode.BleTimeoutError,
            `BLE response timeout after ${timeout}ms for ${name}`
          ),
      });

      const result = await session.call(name, data, callOptions);
      completed = true;
      return result;
    } catch (e) {
      this.protocolV2Assemblers.get(uuid)?.reset();
      this.resetProtocolV2Frames();
      Log?.error('[ReactNativeBleTransport] Protocol V2 call error:', e);
      throw e;
    } finally {
      if (!completed) {
        this.protocolV2Assemblers.get(uuid)?.reset();
      }
      this.resetProtocolV2Frames();
      if (this.runPromise === runPromise) {
        this.runPromise = null;
      }
    }
  }

  getProtocolType(path: string): ProtocolType {
    return this.deviceProtocol.get(path) ?? 'V1';
  }
}
