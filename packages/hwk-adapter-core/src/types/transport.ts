/**
 * Low-level device descriptor from Transport layer.
 * Represents a physical device detected by USB/BLE scanning.
 */
export interface DeviceDescriptor {
  /** Unique device path (USB serial number, BLE address, etc.) */
  path: string;
  /** USB product ID */
  product?: number;
  /** USB vendor ID */
  vendor?: number;
  /** Device type/model identifier */
  type?: string;
  /** Human-readable display name from the transport layer. */
  name?: string;
  /** Stable Ledger BLE identifier from the raw RN BLE `Device.name` field. */
  bleName?: string;
  /** User-visible Ledger BLE local name from the raw RN BLE `Device.localName` field. */
  localName?: string;
  /** Transport identifier (e.g., 'WEB-HID', 'BLE') */
  transport?: string;
  /** BLE RSSI when provided by the transport scanner. */
  rssi?: number | null;
}

export interface DeviceConnectEvent {
  type: 'device-connected';
  descriptor: DeviceDescriptor;
}

export interface DeviceDisconnectEvent {
  type: 'device-disconnected';
  descriptor: DeviceDescriptor;
}

export type DeviceChangeEvent = DeviceConnectEvent | DeviceDisconnectEvent;
