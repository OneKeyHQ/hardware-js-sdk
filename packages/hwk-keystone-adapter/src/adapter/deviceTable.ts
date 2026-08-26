import { normalizePath } from './pathUtils';

import type { KeystoneParsedAccount } from '../urEngine/types';
import type { ChainCapability, DeviceCapabilities, DeviceInfo } from '@onekeyfe/hwk-adapter-core';

/** `keystone-qr:<mfp>` is the QR-only connectId; a merged USB session gets its own (phase 4). */
export const QR_CONNECT_ID_PREFIX = 'keystone-qr:';

export function qrConnectId(masterFingerprint: string): string {
  return `${QR_CONNECT_ID_PREFIX}${masterFingerprint}`;
}

export interface KeystoneAccountEntry extends KeystoneParsedAccount {
  hwkChain: ChainCapability;
}

export function accountKey(hwkChain: ChainCapability, path: string): string {
  return `${hwkChain}:${normalizePath(path)}`;
}

export interface KeystoneDeviceRecord {
  /** Lowercase hex BIP32 master fingerprint — the cross-channel wallet identity; doubles as `deviceId`. */
  masterFingerprint: string;
  connectId: string;
  /** Model string from the device (e.g. "Keystone 3 Pro"); not unique per unit. */
  model?: string;
  deviceVersion?: string;
  /** Keyed by `accountKey(hwkChain, path)`. Holds whatever was directly synced — usually account-level (3-segment) entries for EVM, exact leaf entries for SOL. */
  accounts: Map<string, KeystoneAccountEntry>;
  importedAt: number;
  /**
   * Set to the connector's `sessionId` (== this record's own mfp, per
   * `KeystoneUsbConnectorBase.connect`) once a live USB session exists for
   * this wallet. Cleared by `disconnectDevice`. Presence of this field is
   * what `KeystoneAdapter._resolveUr` uses to route a call over USB instead
   * of QR.
   */
  usbSessionId?: string;
  /**
   * True once this wallet has completed at least one QR round trip.
   * Distinguishes "USB session dropped but this wallet was also QR-synced —
   * fall back to a QR-only entry" from "this was a USB-only wallet that
   * never synced over QR — drop the entry entirely" on USB disconnect.
   */
  qrSynced?: boolean;
}

export function createDeviceRecord(masterFingerprint: string): KeystoneDeviceRecord {
  return {
    masterFingerprint,
    connectId: qrConnectId(masterFingerprint),
    accounts: new Map(),
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
    deviceId: record.masterFingerprint,
    connectId: record.connectId,
    connectionType: record.usbSessionId ? 'usb' : 'qr',
    capabilities: CAPABILITIES,
    raw: { availableChannels },
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
