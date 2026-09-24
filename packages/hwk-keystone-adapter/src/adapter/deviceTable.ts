import { normalizePath } from './pathUtils';

import type { KeystoneParsedAccount } from '../urEngine/types';
import type { ChainCapability, DeviceCapabilities, DeviceInfo } from '@onekeyfe/hwk-adapter-core';

export const KEYSTONE_WALLET_CONNECT_ID_PREFIX = 'keystone-wallet:';

/** Account a QR cold start requests when the caller named no path; any path returns the mfp. */
export const KEYSTONE_COLD_START_PATH = "m/44'/60'/0'";

export function walletConnectId(masterFingerprint: string): string {
  return `${KEYSTONE_WALLET_CONNECT_ID_PREFIX}${masterFingerprint}`;
}

export interface KeystoneAccountEntry extends KeystoneParsedAccount {
  hwkChain: ChainCapability;
}

export function accountKey(hwkChain: ChainCapability, path: string): string {
  return `${hwkChain}:${normalizePath(path)}`;
}

export interface KeystoneDeviceRecord {
  /** Lowercase 8-char BIP32 master fingerprint: the wallet identity and the BC-UR xfp. */
  masterFingerprint: string;
  connectId: string;
  /** Optional physical-device id exposed by some Keystone QR export menus. */
  hardwareDeviceId?: string;
  /** Model string from the device (e.g. "Keystone 3 Pro"); not unique per unit. */
  model?: string;
  deviceVersion?: string;
  importedAt: number;
  /** Connector session id while a live USB session exists; its presence routes calls over USB. */
  usbSessionId?: string;
  /**
   * Stays true after the USB session is lost, so only these wallets wait through the device's
   * USB re-enumeration window.
   */
  hadUsbSession?: boolean;
  /** True after one QR round trip; on USB disconnect it decides demote-to-QR versus drop. */
  qrSynced?: boolean;
}

export function createDeviceRecord(masterFingerprint: string): KeystoneDeviceRecord {
  return {
    masterFingerprint,
    connectId: walletConnectId(masterFingerprint),
    importedAt: Date.now(),
  };
}

const CAPABILITIES: DeviceCapabilities = { persistentDeviceIdentity: true };

export function toDeviceInfo(record: KeystoneDeviceRecord): DeviceInfo {
  // `connectionType` is the channel a call would use now; `raw.availableChannels`
  // lists both for a merged QR + USB wallet.
  let availableChannels: Array<'qr' | 'usb'> = ['qr'];
  if (record.usbSessionId) {
    availableChannels = record.qrSynced ? ['qr', 'usb'] : ['usb'];
  }
  return {
    vendor: 'keystone',
    model: record.model ?? 'unknown',
    modelName: record.model,
    firmwareVersion: record.deviceVersion ?? '0.0.0',
    deviceId: record.masterFingerprint,
    connectId: record.connectId,
    connectionType: record.usbSessionId ? 'usb' : 'qr',
    capabilities: CAPABILITIES,
    raw: {
      availableChannels,
      masterFingerprint: record.masterFingerprint,
      hardwareDeviceId: record.hardwareDeviceId,
    },
  };
}

/** Device row for a not-yet-synced wallet during a cold-start round trip. */
export function placeholderDeviceInfo(): DeviceInfo {
  return {
    vendor: 'keystone',
    model: 'unknown',
    firmwareVersion: '0.0.0',
    deviceId: '',
    connectId: '',
    connectionType: 'qr',
    capabilities: CAPABILITIES,
  };
}
