import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import transport, { COMMON_HEADER_SIZE } from '@onekeyfe/hd-transport';
import {
  BleManager as BlePlxManager,
  Device,
  BleErrorCode,
  Characteristic,
  ScanMode,
} from 'react-native-ble-plx';
import ByteBuffer from 'bytebuffer';
import { initializeBleManager, getConnectedDeviceIds, getBondedDevices } from './BleManager';
import { subscribeBleOn } from './subscribeBleOn';
import {
  PERMISSION_ERROR,
  LOCATION_ERROR,
  isOnekeyDevice,
  getBluetoothServiceUuids,
  getInfosForServiceUuid,
  IOS_PACKET_LENGTH,
  ANDROID_PACKET_LENGTH,
} from './constants';
import { Deferred, create as createDeferred } from './utils/deferred';
import { isHeaderChunk } from './utils/validateNotify';
import BleTransport from './BleTransport';
import timer from './utils/timer';
import type { BleAcquireInput, TransportOptions } from './types';

const { check, buildBuffers, receiveOne, parseConfigure } = transport;

const transportCache: Record<string, any> = {};

let connectOptions: Record<string, unknown> = {
  requestMTU: 512,
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

  constructor(options: TransportOptions) {
    this.scanTimeout = options.scanTimeout ?? 3000;
  }

  init() {}

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
        console.log('subscribeBleOn error: ', error);
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
            console.log('ble scan manager: ', blePlxManager);
            console.log('ble scan error: ', error);
            if (
              [BleErrorCode.BluetoothPoweredOff, BleErrorCode.BluetoothInUnknownState].includes(
                error.errorCode
              )
            ) {
              reject(new Error(PERMISSION_ERROR));
            } else {
              reject(error);
            }
            return;
          }

          if (isOnekeyDevice(device?.name ?? null, device?.id)) {
            console.log('search device start ======================');

            const { name, localName, id } = device ?? {};
            console.log(
              `device name: ${name ?? ''}\nlocalName: ${localName ?? ''}\nid: ${id ?? ''}`
            );
            addDevice(device as unknown as Device);

            console.log('search device end ======================\n');
          }
        }
      );

      getConnectedDeviceIds(getBluetoothServiceUuids()).then(devices => {
        for (const device of devices) {
          console.log('search connected peripheral: ', device.id);
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
      throw new Error('uuid is required');
    }

    let device: Device | null = null;

    if (transportCache[uuid]) {
      /**
       * If the transport is not released due to an exception operation
       * it will be handled again here
       */
      console.log('@onekey/hd-ble-sdk transport not be released, will release: ', uuid);
      await this.release(uuid);
    }

    const blePlxManager = await this.getPlxManager();
    try {
      await subscribeBleOn(blePlxManager);
    } catch (error) {
      console.log('subscribeBleOn error: ', error);
      throw error;
    }

    if (!device) {
      const devices = await blePlxManager.devices([uuid]);
      [device] = devices;
    }

    if (!device) {
      const connectedDevice = await blePlxManager.connectedDevices(getBluetoothServiceUuids());
      const deviceFilter = connectedDevice.filter(device => device.id === uuid);
      console.log(`found connected device count: ${deviceFilter.length}`);
      [device] = deviceFilter;
    }

    if (!device) {
      console.log('try to connect to device: ', uuid);
      try {
        device = await blePlxManager.connectToDevice(uuid, connectOptions);
      } catch (e) {
        console.log('try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          connectOptions = {};
          device = await blePlxManager.connectToDevice(uuid);
        } else {
          throw e;
        }
      }
    }

    if (!device) {
      throw new Error('unable to connect to device');
    }

    if (!(await device.isConnected())) {
      console.log('not connected, try to connect to device: ', uuid);

      try {
        await device.connect(connectOptions);
      } catch (e) {
        console.log('try to connect to device has error: ', e);
        if (
          e.errorCode === BleErrorCode.DeviceMTUChangeFailed ||
          e.errorCode === BleErrorCode.OperationCancelled
        ) {
          connectOptions = {};
          await device.connect();
        } else {
          throw e;
        }
      }
    }

    // check device is bonded
    if (Platform.OS === 'android') {
      const bondedDevices = await getBondedDevices();
      const hasBonded = !!bondedDevices.find(bondedDevice => bondedDevice.id === device?.id);
      if (!hasBonded) {
        throw new Error('device is not bonded');
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
          // empty
        }
      }
    }

    if (!infos) {
      throw new Error('BLEServiceNotFound: service not found');
    }

    const { serviceUuid, writeUuid, notifyUuid } = infos;

    if (!characteristics) {
      characteristics = await device.characteristicsForService(serviceUuid);
    }

    if (!characteristics) {
      throw new Error('BLEServiceNotFound: characteristics not found');
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
      throw new Error('BLECharacteristicNotFound: write characteristic not found');
    }

    if (!notifyCharacteristic) {
      throw new Error('BLECharacteristicNotFound: notify characteristic not found');
    }

    if (!writeCharacteristic.isWritableWithResponse) {
      throw new Error('BLECharacteristicNotWritable: write characteristic not writable');
    }

    if (!notifyCharacteristic.isNotifiable) {
      throw new Error('BLECharacteristicNotNotifiable: notify characteristic not notifiable');
    }

    const transport = new BleTransport(device, writeCharacteristic, notifyCharacteristic);
    transport.nofitySubscription = this._monitorCharacteristic(transport.notifyCharacteristic);
    transportCache[uuid] = transport;

    device.onDisconnected(() => {
      this.release(uuid);
    });

    return { uuid };
  }

  _monitorCharacteristic(characteristic: Characteristic) {
    let bufferLength = 0;
    let buffer: any[] = [];
    const subscription = characteristic.monitor((error, c) => {
      if (error) {
        console.log(`error monitor ${characteristic.uuid}: ${error as unknown as string}`);
        return;
      }

      if (!c) {
        throw new Error('Monitor Error: characteristic not found');
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
        console.log('monitor data error: ', error);
        this.runPromise?.reject(error);
      }
    });

    return () => {
      console.log('remove characteristic monitor: ', characteristic.uuid);
      subscription.remove();
    };
  }

  async release(uuid: string) {
    const transport = transportCache[uuid];

    if (transport) {
      delete transportCache[uuid];
      transport.nofitySubscription?.();
    }

    /**
     * The current strategy does not require disconnection
     */
    // await blePlxManager.cancelDeviceConnection(uuid);
    return Promise.resolve(true);
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this.stopped) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject('Transport stopped.');
    }
    if (this._messages == null) {
      throw new Error('Transport not configured.');
    }

    if (this.runPromise) {
      throw new Error('Transport_CallInProgress');
    }

    const transport = transportCache[uuid] as BleTransport;
    if (!transport) {
      throw new Error('Transport not found.');
    }

    this.runPromise = createDeferred();
    const messages = this._messages;
    console.log('transport-react-native', 'call-', ' name: ', name, ' data: ', data);
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
          console.log('@onekey/hd-ble-sdk send more packet hex strting: ', chunk.toString('hex'));
          try {
            await transport.writeCharacteristic.writeWithoutResponse(chunk.toString('base64'));
            chunk = ByteBuffer.allocate(packetCapacity);
          } catch (e) {
            this.runPromise = null;
            console.log('writeCharacteristic write error: ', e);
            return;
          }
        }
      }
    } else {
      for (const o of buffers) {
        const outData = o.toString('base64');
        console.log('@onekey/hd-ble-sdk send hex strting: ', o.toString('hex'));
        try {
          await transport.writeCharacteristic.writeWithResponse(outData);
        } catch (e) {
          this.runPromise = null;
          console.log('writeCharacteristic write error: ', e);
          return;
        }
      }
    }

    try {
      const response = await this.runPromise.promise;

      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      console.log('@onekey/hd-ble-sdk receive data: ', response);
      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      console.log('call error: ', e);
      return e;
    } finally {
      this.runPromise = null;
    }
  }

  stop() {
    this.stopped = true;
  }
}

export { PERMISSION_ERROR, LOCATION_ERROR };
