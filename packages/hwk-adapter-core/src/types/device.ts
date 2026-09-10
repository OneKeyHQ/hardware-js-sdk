import type { ChainForFingerprint } from './fingerprint';

export type VendorType = 'trezor' | 'ledger' | 'keystone';

/** 'qr' is a virtual channel: UR payloads travel via app-rendered/scanned QR codes. */
export type ConnectionType = 'usb' | 'ble' | 'qr';

export type TransportType = 'usb' | 'ble' | 'hid' | 'bridge' | 'qr';

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

/**
 * How long a discovery handle remains safe to use for a new connection.
 * This is deliberately separate from post-connect device identity.
 */
export type SearchTargetReusePolicy = 'current-discovery' | 'reconnectable' | 'rediscover';

export function resolveSearchTargetReusePolicy(
  device: Pick<DeviceInfo, 'connectionType' | 'capabilities'>
): SearchTargetReusePolicy {
  if (device.capabilities?.persistentDeviceIdentity) return 'reconnectable';
  return 'current-discovery';
}

/**
 * A selectable result from hardware discovery. It may represent a physical
 * transport endpoint or an interactive entry such as Keystone QR; it is not a
 * physical-device or wallet identity.
 */
export interface DeviceSearchTarget {
  /** Opaque handle scoped to the adapter's current discovery state. */
  searchTargetId: string;
  /**
   * Whether the handle itself may be retried. This says nothing about the
   * identity learned after connect and must not be inferred from a stored
   * connectId.
   */
  searchTargetReusePolicy?: SearchTargetReusePolicy;
  vendor: VendorType;
  connectionType: ConnectionType;
  kind: 'physical' | 'interactive';
  label?: string;
  model?: string;
  modelName?: string;
  serialNumber?: string;
}

/**
 * @deprecated Use DeviceSearchTarget. Kept for consumers of the pre-release
 * connection-target API.
 */
export type ConnectionTarget = Omit<DeviceSearchTarget, 'searchTargetId'> & {
  targetId: string;
  searchTargetId?: string;
};

export type WalletIdentity =
  | {
      vendor: 'ledger';
      type: 'chainFingerprint';
      chain: ChainForFingerprint;
      value: string;
    }
  | {
      vendor: 'trezor';
      type: 'deviceId';
      value: string;
    }
  | {
      vendor: 'keystone';
      type: 'walletId';
      value: string;
    };
