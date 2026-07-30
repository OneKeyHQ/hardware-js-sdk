import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';

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

  async writeWithRetry(data: string): Promise<void> {
    await this.writeCharacteristic.writeWithoutResponse(data);
  }
}
