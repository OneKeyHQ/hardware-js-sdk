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
  /** BLE device name (e.g., "Nano X 123A") — contains stable 4-digit HEX suffix */
  name?: string;
  /** Transport identifier (e.g., 'WEB-HID', 'BLE') */
  transport?: string;
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
