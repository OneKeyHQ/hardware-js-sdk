import { Buffer } from 'buffer';
import transport from '@onekeyfe/hd-transport';
import { BleManager, Device, BleErrorCode, Characteristic } from 'react-native-ble-plx';
import { subscribeBleOn } from './subscribeBleOn';
import { isOnekeyDevice, getBluetoothServiceUuids, getInfosForServiceUuid } from './constants';
import type { BleAcquireInput, TransportOptions } from './types';
import BleTransport from './BleTransport';
import timer from './utils/timer';
import { Deferred, create as createDeferred } from './utils/deferred';
import { isHeaderChunk } from './utils/validateNotify';

const { check, buildBuffer, receiveOne, parseConfigure } = transport;

const bleManager = new BleManager();

const transportCache: Record<string, any> = {};

let connectOptions: Record<string, unknown> = {
  requestMTU: 1500,
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
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  stopped = false;

  scanTimeout = 3000;

  runPromise: Deferred<any> | null = null;

  constructor(options: TransportOptions) {
    this.scanTimeout = options.scanTimeout ?? 3000;
  }

  init() {
    // empty
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {
    // empty
  }

  /**
   * 获取设备列表
   * 在搜索超过超时时间或设备数量大于 5 台时，返回 OneKey 设备，
   * @returns
   */
  async enumerate() {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Device[]>(async resolve => {
      const deviceList: Device[] = [];
      await subscribeBleOn(bleManager);
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('ble scan error: ', error);
          return;
        }

        if (isOnekeyDevice(device?.name ?? null, device?.id)) {
          console.log('search device start ======================');
          const { name, localName, id } = device ?? {};
          console.log(`device name: ${name ?? ''}\nlocalName: ${localName ?? ''}\nid: ${id ?? ''}`);
          deviceList.push(device as unknown as Device);

          if (deviceList.length >= 5) {
            resolve(deviceList);
            removeTimeout();
          }

          console.log('search device end ======================\n');
        }
      });

      const removeTimeout = timer.timeout(() => {
        resolve(deviceList);
      }, this.scanTimeout);
    });
  }

  async acquire(input: BleAcquireInput) {
    const { uuid } = input;

    if (!uuid) {
      throw new Error('uuid is required');
    }

    let device;

    if (transportCache[uuid]) {
      console.log('transport in cache, using that');
      return { uuid };
    }

    await subscribeBleOn(bleManager);

    if (!device) {
      const devices = await bleManager.devices([uuid]);
      [device] = devices;
    }

    if (!device) {
      const connectedDevice = await bleManager.connectedDevices(getBluetoothServiceUuids());
      const deviceFilter = connectedDevice.filter(device => device.id === uuid);
      console.log(`found connected device count: ${deviceFilter.length}`);
      [device] = deviceFilter;
    }

    if (!device) {
      console.log('try to connect to device: ', uuid);
      try {
        device = await bleManager.connectToDevice(uuid, connectOptions);
      } catch (e) {
        console.log('try to connect to device has error: ', e);
        if (e.errorCode === BleErrorCode.DeviceMTUChangeFailed) {
          connectOptions = {};
          device = await bleManager.connectToDevice(uuid);
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
        if (e.errorCode === BleErrorCode.DeviceMTUChangeFailed) {
          connectOptions = {};
          await device.connect();
        } else {
          throw e;
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
      console.log('device disconnected');
      transport.nofitySubscription?.();
      delete transportCache[uuid];
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
        if (isHeaderChunk(data)) {
          bufferLength = data.readInt32BE(5);
          buffer = [...data.subarray(3)];
        } else {
          buffer = buffer.concat([...data]);
        }

        if (buffer.length >= bufferLength) {
          const value = Buffer.from(buffer);
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
    }

    await bleManager.cancelDeviceConnection(uuid);
    console.log(`user disconnect(${uuid}`);
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
    console.log(
      'transport-react-native',
      'call-',
      'messages: ',
      messages,
      ' name: ',
      name,
      ' data: ',
      data
    );
    const o = buildBuffer(messages, name, data);
    const outData = o.toString('base64');
    await transport.writeCharacteristic.writeWithResponse(outData);
    try {
      const response = await this.runPromise.promise;

      console.log('runPromise response is : ', response);
    } catch (e) {
      return e;
    } finally {
      this.runPromise = null;
    }
  }

  stop() {
    this.stopped = true;
  }
}