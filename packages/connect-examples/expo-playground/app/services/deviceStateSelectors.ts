import type { DeviceState } from '@onekeyfe/hd-core';

export type FirmwareVersionInfo = {
  bootloaderVersion?: string;
  firmwareVersion?: string;
  bleVersion?: string;
};

export function parseDeviceVersionTuple(
  version: string | null | undefined
): [number, number, number] | null {
  if (!version) return null;
  const parts = version.split('.').slice(0, 3).map(Number);
  if (parts.length === 0 || parts.some(part => !Number.isFinite(part))) {
    return null;
  }
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function getPassphraseProtectionFromDeviceState(
  state?: DeviceState | null
): boolean | undefined {
  const value = state?.status.passphraseProtection;
  return typeof value === 'boolean' ? value : undefined;
}

export function getFirmwareVersionsFromDeviceState(
  state?: DeviceState | null
): FirmwareVersionInfo | undefined {
  if (!state) return undefined;
  const versions = {
    bootloaderVersion: state.versions.bootloader || undefined,
    firmwareVersion: state.versions.firmware || undefined,
    bleVersion: state.versions.ble || undefined,
  };
  return versions.bootloaderVersion || versions.firmwareVersion || versions.bleVersion
    ? versions
    : undefined;
}
