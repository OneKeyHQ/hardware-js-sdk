import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import {
  BleManager as BlePlxManager,
  Device,
  BleErrorCode,
  Characteristic,
  ScanMode,
} from 'react-native-ble-plx';
import ByteBuffer from 'bytebuffer';
import transport, { COMMON_HEADER_SIZE } from '@onekeyfe/hd-transport';
import { createDeferred, Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import type EventEmitter from 'events';
import { initializeBleManager, getConnectedDeviceIds, getBondedDevices } from './BleManager';
import { subscribeBleOn } from './subscribeBleOn';
import {
  isOnekeyDevice,
  getBluetoothServiceUuids,
  getInfosForServiceUuid,
  IOS_PACKET_LENGTH,
  ANDROID_PACKET_LENGTH,
} from './constants';
import { isHeaderChunk } from './utils/validateNotify';
import BleTransport from './BleTransport';
import timer from './utils/timer';
import type { BleAcquireInput, TransportOptions } from './types';

const { check, buildBuffers, receiveOne, parseConfigure } = transport;

const transportCache: Record<string, any> = {};

let connectOptions: Record<string, unknown> = {
  requestMTU: 256,
  timeout: 3000,
};

const tryToGetConfiguration = (device: Device) => {
  if (!device || !device.serviceUUIDs) return null;
  const [serviceUUID] = device.serviceUUIDs;
  const infos = getInfosForServiceUuid(serviceUUID, 'classic');
  if (!infos) return null;
  return infos;
};

export default class ReactNativeBleTransport {
  blePlxManager: BlePlxManager | undefined;

  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  stopped = false;

  scanTimeout = 3000;

  runPromise: Deferred<any> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  constructor(options: TransportOptions) {
    this.scanTimeout = options.scanTimeout ?? 3000;
  }

  init(logger: any, emitter: EventEmitter) {
    this.Log = logger;
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
    initializeBleManager();
    return Promise.resolve(this.blePlxManager);
  }

  /**
   * 获取设备列表
   * 在搜索超过超时时间或设备数量大于 5 台时，返回 OneKey 设备，
   * @returns
   */
  async enumerate() {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Device[]>(async (resolve, reject) => {
      const deviceList: Device[] = [];
      const blePlxManager = await this.getPlxManager();
      try {
        await subscribeBleOn(blePlxManager);
      } catch (error) {
        this.Log.debug('subscribeBleOn error: ', error);
        reject(error);
        return;
      }

      blePlxManager.startDeviceScan(
        null,
        {
          scanMode: ScanMode.LowLatency,
        },
        (error, device) => {
          if (error) {
            this.Log.debug('ble scan manager: ', blePlxManager);
            this.Log.debug('ble scan error: ', error);
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
            this.Log.debug('search device start ======================');
            const { name, localName, id } = device ?? {};
            this.Log.debug(
              `device name: ${name ?? ''}\nlocalName: ${localName ?? ''}\nid: ${id ?? ''}`
            );
            addDevice(device as unknown as Device);
            this.Log.debug('search device end ======================\n');
          }
        }
      );

      getConnectedDeviceIds(getBluetoothServiceUuids()).then(devices => {
        for (const device of devices) {
          this.Log.debug('search connected peripheral: ', device.id);
          addDevice(device as unknown as Device);
        }
      });

      const addDevice = (device: Device) => {
        if (deviceList.every(d => d.id !== device.id)) {
          deviceList.push(device);
        }
      };

      timer.timeout(() => {
        blePlxManager.stopDeviceScan();
        resolve(deviceList);
      }, this.scanTimeout);
    });
  }

  async acquire(input: BleAcquireInput) {
    const { uuid } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    let device: Device | null = null;

    if (transportCache[uuid]) {
      /**
       * If the transport is not released due to an exception operation
       * it will be handled again here
       */
      this.Log.debug('transport not be released, will release: ', uuid);
      await this.release(uuid);
    }

    const blePlxManager = await this.getPlxManager();
    try {
      await subscribeBleOn(blePlxManager);
    } catch (error) {
      this.Log.debug('subscribeBleOn error: ', error);
      throw error;
    }

    if (!device) {
      const devices = await blePlxManager.devices([uuid]);
      [device] = devices;
    }

    if (!device) {
      const connectedDevice = await blePlxManager.connectedDevices(getBluetoothServiceUuids());
      const deviceFilter = connectedDevice.filter(device => device.id === uuid);
      this.Log.debug(`found connected device count: ${deviceFilter.length}`);
      [device] = deviceFilter;
    }

    if (!device) {
      this.Log.debug('try to connect to device: ', uuid);
      try {
        device = await blePlxManager.connectToDevice(uuid, connectOptions);
      } catch (e) {
        this.Log.debug('try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          connectOptions = {};
          this.Log.debug('first try to reconnect without params');
          device = await blePlxManager.connectToDevice(uuid);
        } else if (e.errorCode === BleErrorCode.DeviceAlreadyConnected) {
          this.Log.debug('device already connected');
          throw ERRORS.TypedError(HardwareErrorCode.BleAlreadyConnected);
        } else {
          throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, e.reason ?? e);
        }
      }
    }

    if (!device) {
      throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'unable to connect to device');
    }

    if (!(await device.isConnected())) {
      this.Log.debug('not connected, try to connect to device: ', uuid);

      try {
        await device.connect(connectOptions);
      } catch (e) {
        this.Log.debug('not connected, try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          connectOptions = {};
          this.Log.debug('second try to reconnect without params');
          try {
            await device.connect();
          } catch (e) {
            this.Log.debug('last try to reconnect error: ', e);
            // last try to reconnect device if this issue exists
            // https://github.com/dotintent/react-native-ble-plx/issues/426
            if (e.errorCode === BleErrorCode.OperationCancelled) {
              this.Log.debug('last try to reconnect');
              await device.cancelConnection();
              await device.connect();
            }
          }
        } else {
          throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, e.reason ?? e);
        }
      }
    }

    // check device is bonded
    if (Platform.OS === 'android') {
      const bondedDevices = await getBondedDevices();
      const hasBonded = !!bondedDevices.find(bondedDevice => bondedDevice.id === device?.id);
      if (!hasBonded) {
        throw ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'device is not bonded');
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
          this.Log.error(e);
        }
      }
    }

    if (!infos) {
      try {
        this.Log.debug('cancel connection when service not found');
        await device.cancelConnection();
      } catch (e) {
        this.Log.debug('cancel connection error when service not found: ', e.message || e.reason);
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

    const transport = new BleTransport(device, writeCharacteristic, notifyCharacteristic);
    transport.nofitySubscription = this._monitorCharacteristic(transport.notifyCharacteristic);
    transportCache[uuid] = transport;

    this.emitter?.emit('device-connect', {
      name: device.name,
      id: device.id,
      connectId: device.id,
    });

    const disconnectSubscription = device.onDisconnected(() => {
      this.Log.debug('device disconnect: ', device?.id);
      this.emitter?.emit('device-disconnect', {
        name: device?.name,
        id: device?.id,
        connectId: device?.id,
      });
      this.release(uuid);
      disconnectSubscription?.remove();
    });

    return { uuid };
  }

  _monitorCharacteristic(characteristic: Characteristic) {
    let bufferLength = 0;
    let buffer: any[] = [];
    const subscription = characteristic.monitor((error, c) => {
      if (error) {
        this.Log.debug(
          `error monitor ${characteristic.uuid}, deviceId: ${characteristic.deviceID}: ${
            error as unknown as string
          }`
        );
        if (this.runPromise) {
          this.runPromise.reject(
            ERRORS.TypedError(
              HardwareErrorCode.BleCharacteristicNotifyError,
              error.reason ?? error.message
            )
          );
          this.Log.debug(': monitor notify error, and has unreleased Promise');
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
        this.Log.debug('monitor data error: ', error);
        this.runPromise?.reject(error);
      }
    });

    return () => {
      this.Log.debug('remove characteristic monitor: ', characteristic.uuid);
      subscription.remove();
    };
  }

  async release(uuid: string) {
    const transport = transportCache[uuid];

    if (transport) {
      delete transportCache[uuid];
      transport.nofitySubscription?.();
      // Temporary close the Android disconnect after each request
      if (Platform.OS === 'android') {
        // await this.blePlxManager?.cancelDeviceConnection(uuid);
      }
    }

    return Promise.resolve(true);
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this.stopped) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject(ERRORS.TypedError('Transport stopped.'));
    }
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    if (this.runPromise) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    const transport = transportCache[uuid] as BleTransport;
    if (!transport) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound);
    }

    this.runPromise = createDeferred();
    const messages = this._messages;
    // Upload resources on low-end phones may OOM
    if (name === 'ResourceUpdate' || name === 'ResourceAck') {
      this.Log.debug('transport-react-native', 'call-', ' name: ', name, ' data: ', {
        file_name: data?.file_name,
        hash: data?.hash,
      });
    } else {
      this.Log.debug('transport-react-native', 'call-', ' name: ', name, ' data: ', data);
    }

    const buffers = buildBuffers(messages, name, data);

    if (name === 'FirmwareUpload') {
      const packetCapacity = Platform.OS === 'ios' ? IOS_PACKET_LENGTH : ANDROID_PACKET_LENGTH;
      let index = 0;
      let chunk = ByteBuffer.allocate(packetCapacity);
      while (index < buffers.length) {
        const buffer = buffers[index].toBuffer();
        chunk.append(buffer);
        index += 1;
        if (chunk.offset === packetCapacity || index >= buffers.length) {
          chunk.reset();
          // Upgrading Packet Logs, Too much content to ignore
          // this.Log.debug('send more packet hex strting: ', chunk.toString('hex'));
          try {
            await transport.writeCharacteristic.writeWithoutResponse(chunk.toString('base64'));
            chunk = ByteBuffer.allocate(packetCapacity);
          } catch (e) {
            this.runPromise = null;
            this.Log.error('writeCharacteristic write error: ', e);
            return;
          }
        }
      }
    } else {
      for (const o of buffers) {
        const outData = o.toString('base64');
        // Upload resources on low-end phones may OOM
        // this.Log.debug('send hex strting: ', o.toString('hex'));
        try {
          await transport.writeCharacteristic.writeWithoutResponse(outData);
        } catch (e) {
          this.Log.debug('writeCharacteristic write error: ', e);
          this.runPromise = null;
          if (e.errorCode === BleErrorCode.DeviceDisconnected) {
            throw ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded);
          }
          if (e.errorCode === BleErrorCode.OperationStartFailed) {
            throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, e.reason);
          }
          return;
        }
      }
    }

    try {
      const response = await this.runPromise.promise;

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      this.Log.debug('receive data: ', response);
      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log.error('call error: ', e);
      throw e;
    } finally {
      this.runPromise = null;
    }
  }

  stop() {
    this.stopped = true;
  }

  cancel() {
    this.Log.debug('transport-react-native canceled');
    if (this.runPromise) {
      // this.runPromise.reject(new Error('Transport_CallCanceled'));
    }
    this.runPromise = null;
  }
}
