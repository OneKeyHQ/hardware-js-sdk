import { Peripheral, Characteristic } from '@abandonware/noble';

export interface BleDevice {
  id: string;
  peripheral: Peripheral;
  writeCharacteristic?: Characteristic;
  notifyCharacteristic?: Characteristic;
}

export interface BleSession {
  id: string;
  device: BleDevice;
}
