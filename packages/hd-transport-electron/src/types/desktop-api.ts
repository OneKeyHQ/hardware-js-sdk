/**
 * Desktop API types for Electron preload script
 * These types define the core interface for Noble BLE communication
 */

import type { EBleDisconnectReason } from '@onekeyfe/hd-shared';

// Noble BLE API interface - core BLE functionality
export interface NobleBleWriteOptions {
  pacingDelayMs?: number;
}

export type NobleBleIpcErrorPayload = {
  name: string;
  message: string;
  errorCode: number;
  params?: unknown;
};

export type NobleBleIpcErrorResponse = {
  type: 'NobleBleIpcError';
  success: false;
  error: NobleBleIpcErrorPayload;
};

export interface NobleBleAPI {
  enumerate: () => Promise<{ id: string; name: string }[]>;
  getDevice: (uuid: string) => Promise<{ id: string; name: string; mtu?: number } | null>;
  connect: (uuid: string) => Promise<void>;
  // Logical end-of-operation: link stays up, idle countdown starts. Optional —
  // older hosts do not bridge it, so the transport feature-detects.
  release?: (uuid: string, keepSession?: boolean) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;
  subscribe: (uuid: string) => Promise<void>;
  unsubscribe: (uuid: string) => Promise<void>;
  write: (uuid: string, data: string, options?: NobleBleWriteOptions) => Promise<void>;
  onNotification: (callback: (deviceId: string, data: string) => void) => () => void;
  onMtuChanged?: (callback: (device: { id: string; mtu: number }) => void) => () => void;
  /**
   * Fires whenever a BLE link drops. `reason` distinguishes a real peripheral
   * drop from the main process freeing an idle link on its keep-alive timer;
   * it is optional so an older host bridge that omits it still type-checks
   * (absent is treated as a real drop by consumers).
   */
  onDeviceDisconnected: (
    callback: (device: { id: string; name: string; reason?: EBleDisconnectReason }) => void
  ) => () => void;
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
