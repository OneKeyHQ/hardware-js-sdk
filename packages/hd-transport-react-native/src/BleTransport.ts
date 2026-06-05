import { BleErrorCode } from 'react-native-ble-plx';
import { wait } from '@onekeyfe/hd-shared';

import { bleLogger } from './logger';

import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';

const Log = bleLogger;

export default class BleTransport {
  id: string;

  name = 'ReactNativeBleTransport';

  device: Device;

  mtuSize = 23;

  writeCharacteristic: Characteristic;

  notifyCharacteristic: Characteristic;

  notifySubscription?: Subscription;

  disconnectSubscription?: Subscription;

  notifyTransactionId?: string;

  monitorToken?: number;

  static MAX_RETRIES = 5;

  static RETRY_DELAY = 2000;

  constructor(
    device: Device,
    writeCharacteristic: Characteristic,
    notifyCharacteristic: Characteristic
  ) {
    this.id = device.id;
    this.device = device;
    this.writeCharacteristic = writeCharacteristic;
    this.notifyCharacteristic = notifyCharacteristic;
  }

  /**
   * @description only for pro / touch , while upgrade firmware
   * @param data
   * @param retryCount
   * @returns
   */
  async writeWithRetry(data: string, retryCount = BleTransport.MAX_RETRIES): Promise<void> {
    try {
      await this.writeCharacteristic.writeWithoutResponse(data);
    } catch (error) {
      Log?.debug(
        `Write retry attempt ${BleTransport.MAX_RETRIES - retryCount + 1}, error: ${error}`
      );
      if (retryCount > 0) {
        await wait(BleTransport.RETRY_DELAY);
        if (
          error.errorCode === BleErrorCode.DeviceDisconnected ||
          error.errorCode === BleErrorCode.CharacteristicNotFound
        ) {
          try {
            await this.device.connect();
            await this.device.discoverAllServicesAndCharacteristics();
          } catch (e) {
            Log?.debug(`Connect or discoverAllServicesAndCharacteristics error: ${e}`);
          }
        } else {
          Log?.debug(`writeCharacteristic error: ${error}`);
        }
        return this.writeWithRetry(data, retryCount - 1);
      }
      throw error;
    }
  }
}
