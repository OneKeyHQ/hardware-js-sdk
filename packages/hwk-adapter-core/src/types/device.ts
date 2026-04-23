export type VendorType = 'trezor' | 'ledger';

export type ConnectionType = 'usb' | 'ble';

export type TransportType = 'usb' | 'ble' | 'hid' | 'bridge';

/**
 * Device capabilities — describes what a specific device/connection
 * combination can or cannot do. Varies by vendor, model, and connection type.
 *
 * This enables business logic to check capabilities instead of hard-coding
 * vendor-specific conditions (e.g., `if (vendor === 'ledger')`).
 */
export interface DeviceCapabilities {
  /**
   * Whether connectId/deviceId persist across sessions.
   *
   * - `true`: IDs are stable (e.g., OneKey USB, Trezor USB).
   *   Business logic can match devices by stored connectId/deviceId.
   * - `false`: IDs are ephemeral, regenerated each session (e.g., Ledger WebHID).
   *   Business logic should NOT rely on stored connectId/deviceId for matching.
   */
  persistentDeviceIdentity: boolean;
}

export interface DeviceInfo {
  vendor: VendorType;
  model: string;
  firmwareVersion: string;
  deviceId: string;
  connectId: string;
  label?: string;
  connectionType: ConnectionType;
  battery?: number;

  /** Device capabilities — varies by vendor, model, and connection type */
  capabilities?: DeviceCapabilities;
}

export interface DeviceTarget {
  connectId: string;
  deviceId: string;
}
