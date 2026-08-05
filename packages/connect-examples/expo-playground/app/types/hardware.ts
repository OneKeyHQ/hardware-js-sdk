import type { DeviceState, Features, IDeviceType, OnekeyFeatures } from '@onekeyfe/hd-core';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';

export interface DeviceInfo {
  connectId: string | null;
  connectProtocol?: HardwareConnectProtocol;
  serialNo?: string | null;
  deviceId: string | null;
  uuid: string;
  deviceType: IDeviceType;
  name: string;
  label?: string;
  path?: string;
  state?: DeviceState;
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
}

export interface SearchDeviceInfo {
  connectId: string | null;
  connectProtocol?: HardwareConnectProtocol;
  serialNo?: string | null;
  deviceId: string | null;
  uuid: string;
  deviceType: IDeviceType;
  name: string;
}

export interface DeviceDisplayInfo {
  name: string;
  deviceType: string;
  deviceId: string;
  connectId: string;
  status: 'connected' | 'disconnected' | 'connecting';
  firmwareVersion?: string;
  isInitialized?: boolean;
  needsBackup?: boolean;
  pinProtection?: boolean;
  passphraseProtection?: boolean;
}

export interface ApiResponse {
  success: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}

export interface UIEventMessage {
  type: string;
  payload?: unknown;
}

export interface PassphraseParams {
  value: string;
  passphraseOnDevice: boolean;
  save: boolean;
}

export interface CommonParams {
  keepSession?: boolean;
  retryCount?: number;
  pollIntervalTime?: number;
  timeout?: number;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
  initSession?: boolean;
  deriveCardano?: boolean;
  detectBootloaderDevice?: boolean;
  skipWebDevicePrompt?: boolean;
  path?: string;
  showOnOneKey?: boolean;
  chainId?: number;
  coin?: string;
  message?: string;
  messageHex?: string;
  txData?: string;
  transaction?: Record<string, unknown>;
  bundle?: Array<Record<string, unknown>>;
  address?: string;
  amount?: string;
  fee?: string;
}

export interface HardwareState {
  initialized: boolean;
  isInitializing: boolean;
  error: string | null;
}
