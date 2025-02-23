export type TransportType = 'usb' | 'ble';

export interface DeviceTransportConfig {
  type: TransportType;
  deviceId: string;
}
