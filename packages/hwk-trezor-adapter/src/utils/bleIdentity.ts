import { TREZOR_BLE_SUPPORTED_MODELS, TREZOR_BLE_UUIDS } from '../constants';

import type { TrezorBleDescriptor } from '../types';

export function isTrezorSafe7BleName(name?: string): boolean {
  if (!name) return false;
  return /\bTrezor\b/i.test(name) && (/\bSafe\s*7\b/i.test(name) || /\bT3W1\b/i.test(name));
}

export function isTrezorBleSupportedModel(model?: string): boolean {
  if (!model) return false;
  const normalizedModel = model.trim().replace(/\s+/g, ' ').toLowerCase();
  return (
    TREZOR_BLE_SUPPORTED_MODELS.some(
      supportedModel => supportedModel.toLowerCase() === normalizedModel
    ) ||
    normalizedModel === 'safe 7' ||
    normalizedModel === 'trezor safe 7'
  );
}

export function isTrezorSafe7BleDescriptor(descriptor: TrezorBleDescriptor): boolean {
  return isTrezorBleDescriptor(descriptor);
}

export function normalizeTrezorBleUuid(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

export function isTrezorBleServiceUuid(uuid: string): boolean {
  return normalizeTrezorBleUuid(uuid) === normalizeTrezorBleUuid(TREZOR_BLE_UUIDS.service);
}

export function isTrezorBleDescriptor(descriptor: TrezorBleDescriptor): boolean {
  const serviceUuids = [
    ...(descriptor.serviceUUIDs ?? []),
    ...(descriptor.advertisedServiceUuids ?? []),
    ...(descriptor.serviceUuids ?? []),
  ];
  return serviceUuids.some(isTrezorBleServiceUuid);
}

export function resolveTrezorBleConnectId(descriptor: TrezorBleDescriptor): string {
  return descriptor.id ?? descriptor.path ?? descriptor.deviceId ?? descriptor.name ?? '';
}
