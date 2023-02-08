import { Device, Characteristic } from '@onekeyfe/react-native-ble-plx';

export default class BleTransport {
  id: string;

  device: Device;

  mtuSize = 20;

  writeCharacteristic: Characteristic;

  notifyCharacteristic: Characteristic;

  nofitySubscription?: () => void;

  constructor(
    device: Device,
    writeCharacteristic: Characteristic,
    notifyCharacteristic: Characteristic
  ) {
    this.id = device.id;
    this.device = device;
    this.writeCharacteristic = writeCharacteristic;
    this.notifyCharacteristic = notifyCharacteristic;
    console.log(`BleTransport(${String(this.id)}) new instance`);
  }
}
