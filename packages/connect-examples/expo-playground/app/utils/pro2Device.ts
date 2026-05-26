import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DeviceInfo } from '../types/hardware';
import type { Features } from '@onekeyfe/hd-core';

const PRO2_FEATURES: Partial<Features> = {
  vendor: 'OneKey',
  major_version: 0,
  minor_version: 0,
  patch_version: 0,
  bootloader_mode: null,
  device_id: null,
  pin_protection: null,
  passphrase_protection: false,
  language: null,
  label: null,
  initialized: null,
  revision: null,
  bootloader_hash: null,
  imported: null,
  unlocked: null,
  firmware_present: null,
  needs_backup: null,
  flags: null,
  model: 'pro2',
  fw_major: null,
  fw_minor: null,
  fw_patch: null,
  fw_vendor: null,
  unfinished_backup: null,
  no_backup: null,
  recovery_mode: null,
  capabilities: [],
  backup_type: null,
  sd_card_present: null,
  sd_protection: null,
  wipe_code_protection: null,
  session_id: null,
  passphrase_always_on_device: null,
  safety_checks: null,
  auto_lock_delay_ms: null,
  display_rotation: null,
  experimental_features: null,
  onekey_device_type: EDeviceType.Pro2,
};

export function createPro2DeviceInfo(device: DeviceInfo): DeviceInfo {
  const features = {
    ...PRO2_FEATURES,
    ...device.features,
    model: device.features?.model ?? 'pro2',
    onekey_device_type: EDeviceType.Pro2,
  } as Features;

  return {
    ...device,
    deviceType: EDeviceType.Pro2,
    name: device.name || 'OneKey Pro 2',
    label: device.label || 'OneKey Pro 2',
    features,
    onekeyFeatures: device.onekeyFeatures,
  };
}

export function isPro2DeviceInfo(device?: DeviceInfo | null): device is DeviceInfo {
  if (!device) return false;
  const model = (device.features?.model ?? '').toLowerCase();
  return (
    device.deviceType === EDeviceType.Pro2 ||
    device.features?.onekey_device_type === EDeviceType.Pro2 ||
    model === 'pro2'
  );
}
