import { deriveWalletId } from '@onekeyfe/hwk-adapter-core';

import { normalizePath } from './pathUtils';

import type { KeystoneParsedAccount } from '../urEngine/types';
import type { ChainCapability, DeviceCapabilities, DeviceInfo } from '@onekeyfe/hwk-adapter-core';

export const KEYSTONE_WALLET_CONNECT_ID_PREFIX = 'keystone-wallet:';

/** Fixed public source used to derive a collision-resistant wallet id. */
export const KEYSTONE_WALLET_ID_PATH = "m/44'/60'/0'";

export function walletConnectId(walletId: string): string {
  return `${KEYSTONE_WALLET_CONNECT_ID_PREFIX}${walletId}`;
}

export interface KeystoneAccountEntry extends KeystoneParsedAccount {
  hwkChain: ChainCapability;
}

export function accountKey(hwkChain: ChainCapability, path: string): string {
  return `${hwkChain}:${normalizePath(path)}`;
}

export interface KeystoneDeviceRecord {
  /** SHA-256 id derived from the fixed account-level identity xpub. */
  walletId: string;
  /** Lowercase 8-char BIP32 fingerprint used by BC-UR as xfp, never as identity. */
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

export function deriveKeystoneWalletId(accounts: KeystoneParsedAccount[]): string {
  const identityAccount = accounts.find(
    account => normalizePath(account.path) === KEYSTONE_WALLET_ID_PATH
  );
  if (!identityAccount?.extendedPublicKey) {
    throw new Error(
      `Keystone identity response is missing the extended public key at ${KEYSTONE_WALLET_ID_PATH}`
    );
  }
  return deriveWalletId(
    `keystone:secp256k1:${KEYSTONE_WALLET_ID_PATH}:${identityAccount.extendedPublicKey.trim()}`
  );
}

export function createDeviceRecord(
  walletId: string,
  masterFingerprint: string
): KeystoneDeviceRecord {
  return {
    walletId,
    masterFingerprint,
    connectId: walletConnectId(walletId),
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
    deviceId: record.walletId,
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
