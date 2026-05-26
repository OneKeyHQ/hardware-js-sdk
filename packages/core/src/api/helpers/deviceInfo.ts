import {
  getDeviceBLEFirmwareVersion,
  getDeviceBleName,
  getDeviceBoardloaderVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceLabel,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
} from '../../utils';

import type {
  DeviceInfoProtocol,
  DeviceInfoSource,
  DeviceInfoStatus,
  GetDeviceInfoParams,
  UnifiedDeviceInfo,
  UnifiedDeviceInfoRaw,
  UnifiedDeviceInfoVerify,
  UnifiedDeviceInfoVersions,
} from '../../types/api/getDeviceInfo';
import type { Features, OnekeyFeatures } from '../../types';
import type { ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';

type BuildDeviceInfoParams = {
  protocol: DeviceInfoProtocol;
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
  protocolV2DeviceInfo?: ProtocolV2DeviceInfo;
  sources: DeviceInfoSource[];
  scope?: GetDeviceInfoParams['scope'];
  includeRaw?: boolean;
};

const isMeaningfulVersion = (version?: string | null) => Boolean(version && version !== '0.0.0');

const versionArrayToString = (version?: Array<number | string | null> | null) => {
  if (!version || version.length === 0) return null;
  const value = version.join('.');
  return isMeaningfulVersion(value) ? value : null;
};

const firstVersion = (...versions: Array<string | null | undefined>) =>
  versions.find(isMeaningfulVersion) ?? null;

const safeGetDeviceUUID = (features?: Features) => (features ? getDeviceUUID(features) : '');

const shouldIncludeVerify = (scope?: GetDeviceInfoParams['scope']) =>
  scope === 'verify' || scope === 'full';

const getDeviceMode = (features?: Features): DeviceInfoStatus['mode'] => {
  if (!features) return 'unknown';
  if (features.bootloader_mode === true) return 'bootloader';
  if (features.initialized === false) return 'notInitialized';
  if (features.initialized === true) return 'normal';
  return 'unknown';
};

const normalizeVersions = (
  features?: Features,
  onekeyFeatures?: OnekeyFeatures
): UnifiedDeviceInfoVersions => ({
  firmware: firstVersion(
    onekeyFeatures?.onekey_firmware_version,
    versionArrayToString(getDeviceFirmwareVersion(features))
  ),
  bootloader: firstVersion(
    onekeyFeatures?.onekey_boot_version,
    versionArrayToString(getDeviceBootloaderVersion(features))
  ),
  board: firstVersion(
    onekeyFeatures?.onekey_board_version,
    versionArrayToString(features ? getDeviceBoardloaderVersion(features) : undefined)
  ),
  ble: firstVersion(
    onekeyFeatures?.onekey_ble_version,
    features?.onekey_ble_version,
    features?.ble_ver,
    versionArrayToString(features ? getDeviceBLEFirmwareVersion(features) : undefined)
  ),
  se01: firstVersion(onekeyFeatures?.onekey_se01_version, features?.onekey_se01_version),
  se02: firstVersion(onekeyFeatures?.onekey_se02_version, features?.onekey_se02_version),
  se03: firstVersion(onekeyFeatures?.onekey_se03_version, features?.onekey_se03_version),
  se04: firstVersion(onekeyFeatures?.onekey_se04_version, features?.onekey_se04_version),
  se01Boot: firstVersion(
    onekeyFeatures?.onekey_se01_boot_version,
    features?.onekey_se01_boot_version
  ),
  se02Boot: firstVersion(
    onekeyFeatures?.onekey_se02_boot_version,
    features?.onekey_se02_boot_version
  ),
  se03Boot: firstVersion(
    onekeyFeatures?.onekey_se03_boot_version,
    features?.onekey_se03_boot_version
  ),
  se04Boot: firstVersion(
    onekeyFeatures?.onekey_se04_boot_version,
    features?.onekey_se04_boot_version
  ),
});

const normalizeStatus = (protocol: DeviceInfoProtocol, features?: Features): DeviceInfoStatus => ({
  mode: getDeviceMode(features),
  initialized: features?.initialized ?? null,
  bootloaderMode: features?.bootloader_mode ?? null,
  unlocked: protocol === 'V2' ? null : features?.unlocked ?? null,
  passphraseProtection: features?.passphrase_protection ?? null,
  backupRequired: features?.needs_backup ?? null,
  language: features?.language ?? null,
  bleEnabled: (features as { ble_enable?: boolean } | undefined)?.ble_enable ?? null,
});

const normalizeVerify = (
  features?: Features,
  onekeyFeatures?: OnekeyFeatures
): UnifiedDeviceInfoVerify => {
  const featureRecord = features as Record<string, string | undefined> | undefined;
  return {
    firmwareBuildId: onekeyFeatures?.onekey_firmware_build_id ?? features?.onekey_firmware_build_id,
    firmwareHash: onekeyFeatures?.onekey_firmware_hash ?? features?.onekey_firmware_hash,
    bootloaderBuildId: onekeyFeatures?.onekey_boot_build_id ?? features?.onekey_boot_build_id,
    bootloaderHash: onekeyFeatures?.onekey_boot_hash ?? features?.onekey_boot_hash,
    boardBuildId: onekeyFeatures?.onekey_board_build_id ?? featureRecord?.onekey_board_build_id,
    boardHash: onekeyFeatures?.onekey_board_hash ?? features?.onekey_board_hash,
    bleBuildId: onekeyFeatures?.onekey_ble_build_id ?? features?.onekey_ble_build_id,
    bleHash: onekeyFeatures?.onekey_ble_hash ?? features?.onekey_ble_hash,
    se01BuildId: onekeyFeatures?.onekey_se01_build_id ?? features?.onekey_se01_build_id,
    se01Hash: onekeyFeatures?.onekey_se01_hash ?? featureRecord?.onekey_se01_hash,
    se02BuildId: onekeyFeatures?.onekey_se02_build_id ?? featureRecord?.onekey_se02_build_id,
    se02Hash: onekeyFeatures?.onekey_se02_hash ?? featureRecord?.onekey_se02_hash,
    se03BuildId: onekeyFeatures?.onekey_se03_build_id ?? featureRecord?.onekey_se03_build_id,
    se03Hash: onekeyFeatures?.onekey_se03_hash ?? featureRecord?.onekey_se03_hash,
    se04BuildId: onekeyFeatures?.onekey_se04_build_id ?? featureRecord?.onekey_se04_build_id,
    se04Hash: onekeyFeatures?.onekey_se04_hash ?? featureRecord?.onekey_se04_hash,
    se01BootBuildId:
      onekeyFeatures?.onekey_se01_boot_build_id ?? features?.onekey_se01_boot_build_id,
    se01BootHash: onekeyFeatures?.onekey_se01_boot_hash ?? features?.onekey_se01_boot_hash,
    se02BootBuildId:
      onekeyFeatures?.onekey_se02_boot_build_id ?? features?.onekey_se02_boot_build_id,
    se02BootHash: onekeyFeatures?.onekey_se02_boot_hash ?? features?.onekey_se02_boot_hash,
    se03BootBuildId:
      onekeyFeatures?.onekey_se03_boot_build_id ?? features?.onekey_se03_boot_build_id,
    se03BootHash: onekeyFeatures?.onekey_se03_boot_hash ?? features?.onekey_se03_boot_hash,
    se04BootBuildId:
      onekeyFeatures?.onekey_se04_boot_build_id ?? features?.onekey_se04_boot_build_id,
    se04BootHash: onekeyFeatures?.onekey_se04_boot_hash ?? features?.onekey_se04_boot_hash,
  };
};

const normalizeRaw = ({
  features,
  onekeyFeatures,
  protocolV2DeviceInfo,
}: Pick<
  BuildDeviceInfoParams,
  'features' | 'onekeyFeatures' | 'protocolV2DeviceInfo'
>): UnifiedDeviceInfoRaw => ({
  ...(features ? { features } : {}),
  ...(onekeyFeatures ? { onekeyFeatures } : {}),
  ...(protocolV2DeviceInfo ? { protocolV2DeviceInfo } : {}),
});

export function buildUnifiedDeviceInfo({
  protocol,
  features,
  onekeyFeatures,
  protocolV2DeviceInfo,
  sources,
  scope = 'basic',
  includeRaw = false,
}: BuildDeviceInfoParams): UnifiedDeviceInfo {
  const mergedFeatures = {
    ...(features ?? {}),
    ...(onekeyFeatures ?? {}),
  } as Features;
  const hasFeatures = Boolean(features || onekeyFeatures);
  const sourceFeatures = hasFeatures ? mergedFeatures : undefined;
  const deviceType = getDeviceType(sourceFeatures);
  const verify = normalizeVerify(sourceFeatures, onekeyFeatures);

  return {
    protocol,
    sources,
    deviceType,
    firmwareType: getFirmwareType(sourceFeatures),
    deviceId: sourceFeatures?.device_id || safeGetDeviceUUID(sourceFeatures),
    serialNo: safeGetDeviceUUID(sourceFeatures),
    label: getDeviceLabel(sourceFeatures),
    bleName: getDeviceBleName(sourceFeatures),
    status: normalizeStatus(protocol, sourceFeatures),
    versions: normalizeVersions(sourceFeatures, onekeyFeatures),
    ...(shouldIncludeVerify(scope) ? { verify } : {}),
    ...(includeRaw
      ? {
          raw: normalizeRaw({
            features,
            onekeyFeatures,
            protocolV2DeviceInfo,
          }),
        }
      : {}),
  };
}
