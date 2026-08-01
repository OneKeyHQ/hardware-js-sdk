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
  /** Machine model id (e.g. "nanoX"). */
  model: string;
  /** Human-readable model name (e.g. "Ledger Nano X"). */
  modelName?: string;
  firmwareVersion: string;
  deviceId: string;
  connectId: string;
  label?: string;
  connectionType: ConnectionType;
  battery?: number;
  /** BLE signal strength (BLE only). */
  rssi?: number | null;
  /** BLE connectable flag (BLE only). */
  isConnectable?: boolean | null;
  /** USB serial number (USB only). */
  serialNumber?: string;

  /** Device capabilities — varies by vendor, model, and connection type */
  capabilities?: DeviceCapabilities;

  /**
   * Vendor-specific raw payload from the post-handshake `Features` (Trezor)
   * or device-info call. Populated by the connector with `{ transport,
   * descriptor, features }` so the app layer can read fields we haven't
   * promoted to the typed surface yet. Treat as informational — promote
   * any consumed field above.
   */
  raw?: Record<string, unknown>;
}

export interface DeviceTarget {
  connectId: string;
  deviceId: string;
}
