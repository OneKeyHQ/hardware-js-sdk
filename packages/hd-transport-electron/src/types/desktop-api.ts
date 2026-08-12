/**
 * Desktop API types for Electron preload script
 * These types define the core interface for Noble BLE communication
 */

// Noble BLE API interface - core BLE functionality
export interface NobleBleWriteOptions {
  pacingDelayMs?: number;
}

export interface NobleBleConnectOptions {
  /** Reuse only a fully initialized physical link; never scan, reconnect, or rediscover services. */
  reuseConnectedOnly?: boolean;
}

export interface NobleBleAPI {
  enumerate: () => Promise<{ id: string; name: string }[]>;
  getDevice: (
    uuid: string
  ) => Promise<{ id: string; name: string; mtu?: number; state?: string } | null>;
  connect: (uuid: string, options?: NobleBleConnectOptions) => Promise<void>;
  /** Optional host capability: reuse a fully initialized link without scanning or reconnecting. */
  connectConnectedOnly?: (uuid: string) => Promise<void>;
  // Logical end-of-operation: link stays up, idle countdown starts. Optional —
  // older hosts do not bridge it, so the transport feature-detects.
  release?: (uuid: string, keepSession?: boolean) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;
  subscribe: (uuid: string) => Promise<void>;
  unsubscribe: (uuid: string) => Promise<void>;
  write: (uuid: string, data: string, options?: NobleBleWriteOptions) => Promise<void>;
  onNotification: (callback: (deviceId: string, data: string) => void) => () => void;
  onMtuChanged?: (callback: (device: { id: string; mtu: number }) => void) => () => void;
  onDeviceDisconnected: (callback: (device: { id: string; name: string }) => void) => () => void;
  checkAvailability: () => Promise<{
    available: boolean;
    state: string;
    unsupported: boolean;
    initialized: boolean;
  }>;
}

// Base Desktop API interface - contains only Noble BLE functionality
export interface DesktopAPI {
  nobleBle?: NobleBleAPI;
}
