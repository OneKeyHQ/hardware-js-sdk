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
  /**
   * Set to the connector's process-local `sessionId` once a live USB session exists for
   * this wallet. Cleared by `releaseInteraction`. Presence of this field is
   * what `KeystoneAdapter._resolveUr` uses to route a call over USB instead
   * of QR.
   */
  usbSessionId?: string;
  /**
   * Remains true after a live USB session is lost. It allows the adapter to
   * wait through the device's short USB re-enumeration window without making
   * wallets that have only ever used QR pay the same retry delay.
   */
  hadUsbSession?: boolean;
  /**
   * True once this wallet has completed at least one QR round trip.
   * Distinguishes "USB session dropped but this wallet was also QR-synced —
   * fall back to a QR-only entry" from "this was a USB-only wallet that
   * never synced over QR — drop the entry entirely" on USB disconnect.
   */
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
  // `connectionType` reflects the channel a call would currently be routed
  // over (USB preferred when live — see `KeystoneAdapter._resolveUr`), not
  // just "however this record was first created". `raw.availableChannels`
  // carries the full picture for a merged (QR + USB) wallet — see §4.2 of
  // docs/design/keystone-integration/README.md.
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

/** A device row for a wallet the adapter hasn't synced yet — used while a cold-start round trip is in flight. */
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
