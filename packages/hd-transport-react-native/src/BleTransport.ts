import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';

export default class BleTransport {
  id: string;

  name = 'ReactNativeBleTransport';

  device: Device;

  mtuSize: number | undefined;

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

  /**
   * Bulk-transfer write (Protocol V1 FirmwareUpload / EmmcFileWrite only).
   *
   * Must stay writeWithoutResponse on every platform. writeWithResponse serialises
   * each packet into its own connection-interval round trip, which on iOS turned a
   * 1.7MB firmware upload (~13.5k packets) into a >10 minute transfer that never
   * finished before the app-level timeout. Protocol V2 and ordinary V1 control
   * messages pick their write type separately and are unaffected by this method.
   */
  async writeWithRetry(data: string): Promise<void> {
    await this.writeCharacteristic.writeWithoutResponse(data);
  }
}
