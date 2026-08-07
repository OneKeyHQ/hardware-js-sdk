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
  /** Device type/model identifier (e.g. "nanoX"). */
  type?: string;
  /** Human-readable model name (e.g. "Ledger Nano X"). */
  modelName?: string;
  /** Human-readable display name from the transport layer. */
  name?: string;
  /** Raw Ledger BLE advertisement name from RN BLE `Device.name`, when available. */
  bleName?: string;
  /** User-visible Ledger BLE local name from the raw RN BLE `Device.localName` field. */
  localName?: string;
  /** Transport identifier (e.g., 'WEB-HID', 'BLE') */
  transport?: string;
  /** BLE RSSI when provided by the transport scanner. */
  rssi?: number | null;
  /** BLE advertised service UUIDs, when provided by the scanner. */
  serviceUUIDs?: string[] | null;
  /** BLE connectable flag, when provided by the scanner. */
  isConnectable?: boolean | null;
  /** USB product name, when provided by the transport. */
  productName?: string;
  /** USB serial number, when provided by the transport. */
  serialNumber?: string;
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
