import transport from '@onekeyfe/hd-transport';
import { BleManager, Device } from 'react-native-ble-plx';
import { subscribeBleOn } from './subscribeBleOn';
import { isOnekeyDevice } from './constants';
import timer from './utils/timer';
import type { TransportOptions } from './types';

const { check, buildOne, receiveOne, parseConfigure } = transport;
const bleManager = new BleManager();

export default class ReactNativeTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  stopped = false;

  scanTimeout = 3000;

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
}
