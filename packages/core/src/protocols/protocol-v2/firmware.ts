import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from '../../firmware-update/errors';

import type { FirmwareTarget } from '../../firmware-update/contracts';

/**
 * DeviceFirmwareTargetType from the current firmware-pro2 submodule.
 */
export const ProtocolV2FirmwareTargetType = {
  FW_MGMT_TARGET_INVALID: 0,
  FW_MGMT_TARGET_CRATE: 1,
  FW_MGMT_TARGET_ROMLOADER: 2,
  FW_MGMT_TARGET_BOOTLOADER: 3,
  FW_MGMT_TARGET_APPLICATION_P1: 4,
  FW_MGMT_TARGET_APPLICATION_P2: 5,
  FW_MGMT_TARGET_COPROCESSOR: 6,
  FW_MGMT_TARGET_SE01: 7,
  FW_MGMT_TARGET_SE02: 8,
  FW_MGMT_TARGET_SE03: 9,
  FW_MGMT_TARGET_SE04: 10,
} as const;

// Keep the existing public API where the constant and value type share the same export name.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ProtocolV2FirmwareTargetType =
  (typeof ProtocolV2FirmwareTargetType)[keyof typeof ProtocolV2FirmwareTargetType];

export const ProtocolV2FirmwareUpdateStatus = {
  PENDING: 0,
  IN_PROGRESS: 1,
  FINISHED: 2,
  FAILED_FILE_NOT_FOUND: 3,
  FAILED_FILE_READ: 4,
  FAILED_FILE_WRITE: 5,
  FAILED_VERIFY: 6,
  FAILED_INSTALL: 7,
  FAILED_ABORT: 8,
  FAILED_BUSY: 9,
  FAILED_ENTRY_OUT_OF_BOUNDS: 10,
} as const;

export type ProtocolV2InstallableFirmwareTarget = Exclude<
  FirmwareTarget,
  'firmware' | 'ble' | 'resource'
>;

export interface ProtocolV2FirmwareTargetDescriptor {
  target: ProtocolV2InstallableFirmwareTarget;
  targetId: ProtocolV2FirmwareTargetType;
  stagingFileName: string;
}

const INSTALLABLE_TARGET_DESCRIPTORS: readonly ProtocolV2FirmwareTargetDescriptor[] = [
  {
    target: 'bootloader',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
    stagingFileName: 'bootloader.bin',
  },
  {
    target: 'p1',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1,
    stagingFileName: 'application_p1.bin',
  },
  {
    target: 'p2',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2,
    stagingFileName: 'application_p2.bin',
  },
  {
    target: 'coprocessor',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR,
    stagingFileName: 'coprocessor.bin',
  },
  {
    target: 'se01',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01,
    stagingFileName: 'se01.bin',
  },
  {
    target: 'se02',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02,
    stagingFileName: 'se02.bin',
  },
  {
    target: 'se03',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03,
    stagingFileName: 'se03.bin',
  },
  {
    target: 'se04',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04,
    stagingFileName: 'se04.bin',
  },
];

export const PROTOCOL_V2_INSTALLABLE_FIRMWARE_TARGETS = Object.freeze(
  INSTALLABLE_TARGET_DESCRIPTORS.map(descriptor => Object.freeze({ ...descriptor }))
);

const TARGET_DESCRIPTOR_BY_TARGET = new Map(
  PROTOCOL_V2_INSTALLABLE_FIRMWARE_TARGETS.map(descriptor => [descriptor.target, descriptor])
);
const TARGET_DESCRIPTOR_BY_ID = new Map<number, ProtocolV2FirmwareTargetDescriptor>(
  PROTOCOL_V2_INSTALLABLE_FIRMWARE_TARGETS.map(descriptor => [descriptor.targetId, descriptor])
);
const TARGET_ID_BY_DECODED_NAME = new Map<string, ProtocolV2FirmwareTargetType>(
  Object.entries(ProtocolV2FirmwareTargetType).map(([name, targetId]) => [name, targetId])
);
const STATUS_BY_DECODED_NAME = new Map<string, number>([
  ['FW_MGMT_UPDATER_TASK_STATUS_PENDING', ProtocolV2FirmwareUpdateStatus.PENDING],
  ['FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS', ProtocolV2FirmwareUpdateStatus.IN_PROGRESS],
  ['FW_MGMT_UPDATER_TASK_STATUS_FINISHED', ProtocolV2FirmwareUpdateStatus.FINISHED],
  [
    'FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_NOT_FOUND',
    ProtocolV2FirmwareUpdateStatus.FAILED_FILE_NOT_FOUND,
  ],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_READ', ProtocolV2FirmwareUpdateStatus.FAILED_FILE_READ],
  [
    'FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_WRITE',
    ProtocolV2FirmwareUpdateStatus.FAILED_FILE_WRITE,
  ],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY', ProtocolV2FirmwareUpdateStatus.FAILED_VERIFY],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_INSTALL', ProtocolV2FirmwareUpdateStatus.FAILED_INSTALL],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_ABORT', ProtocolV2FirmwareUpdateStatus.FAILED_ABORT],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_BUSY', ProtocolV2FirmwareUpdateStatus.FAILED_BUSY],
  [
    'FW_MGMT_UPDATER_TASK_STATUS_FAILED_ENTRY_OUT_OF_BOUNDS',
    ProtocolV2FirmwareUpdateStatus.FAILED_ENTRY_OUT_OF_BOUNDS,
  ],
]);

export const PROTOCOL_V2_RESOURCE_BUNDLE_PATHS = Object.freeze({
  images: 'vol0:/bundles/images/images.okpkg',
  animation: 'vol0:/bundles/images/animation.okpkg',
  wallpaper: 'vol0:/bundles/images/wallpaper.okpkg',
  translations: 'vol0:/bundles/translations/translations.okpkg',
  fonts_roobert: 'vol0:/bundles/font/roobert.okpkg',
  fonts_noto: 'vol0:/bundles/font/noto.okpkg',
});

const protocolV2PlanInvalid = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwarePlanInvalid, detail, { detail });
};

export const getProtocolV2FirmwareTargetDescriptor = (
  target: FirmwareTarget
): ProtocolV2FirmwareTargetDescriptor => {
  const descriptor = TARGET_DESCRIPTOR_BY_TARGET.get(target as ProtocolV2InstallableFirmwareTarget);
  if (!descriptor) {
    return protocolV2PlanInvalid(`Unsupported Protocol V2 firmware target: ${target}`);
  }
  return descriptor;
};

export const getProtocolV2FirmwareTargetDescriptorById = (
  targetId: number
): ProtocolV2FirmwareTargetDescriptor | undefined => TARGET_DESCRIPTOR_BY_ID.get(targetId);

export const normalizeProtocolV2FirmwareTargetId = (
  targetId: number | string
): ProtocolV2FirmwareTargetType | undefined => {
  if (typeof targetId === 'number') {
    return TARGET_DESCRIPTOR_BY_ID.has(targetId)
      ? (targetId as ProtocolV2FirmwareTargetType)
      : undefined;
  }
  const normalized = TARGET_ID_BY_DECODED_NAME.get(targetId);
  return normalized !== undefined && TARGET_DESCRIPTOR_BY_ID.has(normalized)
    ? normalized
    : undefined;
};

export const normalizeProtocolV2FirmwareUpdateStatus = (
  status: number | string | undefined
): number | undefined => {
  if (typeof status === 'number') {
    return status;
  }
  return typeof status === 'string' ? STATUS_BY_DECODED_NAME.get(status) : undefined;
};

export const protocolV2PackedVersionToString = (packedVersion: number): string =>
  `${Math.floor(packedVersion / 0x10000) % 0x100}.${Math.floor(packedVersion / 0x100) % 0x100}.${
    packedVersion % 0x100
  }`;

export const resolveProtocolV2FirmwareStagingPath = (target: FirmwareTarget): string =>
  `vol0:/${getProtocolV2FirmwareTargetDescriptor(target).stagingFileName}`;

export type ProtocolV2ResourceBundleName = keyof typeof PROTOCOL_V2_RESOURCE_BUNDLE_PATHS;

export const normalizeProtocolV2ResourceBundleName = (
  logicalName: string
): ProtocolV2ResourceBundleName => {
  const normalized = logicalName
    .trim()
    .toLowerCase()
    .replace(/\.okpkg$/, '');
  if (!Object.prototype.hasOwnProperty.call(PROTOCOL_V2_RESOURCE_BUNDLE_PATHS, normalized)) {
    return protocolV2PlanInvalid(`Unsupported Protocol V2 resource bundle: ${logicalName}`);
  }
  return normalized as ProtocolV2ResourceBundleName;
};

export const resolveProtocolV2ResourceBundlePath = (logicalName: string): string =>
  PROTOCOL_V2_RESOURCE_BUNDLE_PATHS[normalizeProtocolV2ResourceBundleName(logicalName)];

export const getProtocolV2ResourceBundleNameByPath = (
  devicePath: string
): ProtocolV2ResourceBundleName => {
  const match = Object.entries(PROTOCOL_V2_RESOURCE_BUNDLE_PATHS).find(
    ([, path]) => path === devicePath
  );
  if (!match) {
    return protocolV2PlanInvalid(`Unsupported Protocol V2 resource bundle path: ${devicePath}`);
  }
  return match[0] as ProtocolV2ResourceBundleName;
};
