import { EDeviceType } from '@onekeyfe/hd-shared';

import type { FirmwareUpdateV4Params } from '@onekeyfe/hd-core';

export type ProtocolV2BinaryField = Exclude<
  {
    [K in keyof FirmwareUpdateV4Params]: FirmwareUpdateV4Params[K] extends ArrayBuffer | undefined
      ? K
      : never;
  }[keyof FirmwareUpdateV4Params],
  undefined
>;

export type ProtocolV2FirmwareTarget = {
  param: ProtocolV2BinaryField;
  label: string;
};

export type ProtocolV2ResourceSlot = {
  key: string;
  label: string;
  fileNamePrefix: string;
  devicePath: string;
};

const PROTOCOL_V2_FIRMWARE_TARGETS: readonly ProtocolV2FirmwareTarget[] = [
  { param: 'bootloaderBinary', label: 'Bootloader' },
  { param: 'applicationP1Binary', label: 'APP P1' },
  { param: 'applicationP2Binary', label: 'APP P2' },
  { param: 'coprocessorBinary', label: 'Coprocessor' },
  { param: 'se01Binary', label: 'SE01' },
  { param: 'se02Binary', label: 'SE02' },
  { param: 'se03Binary', label: 'SE03' },
  { param: 'se04Binary', label: 'SE04' },
];

export const PROTOCOL_V2_RESOURCE_SLOTS: readonly ProtocolV2ResourceSlot[] = [
  {
    key: 'firmware_logo',
    label: 'Firmware Logo',
    fileNamePrefix: 'firmware_logo',
    devicePath: 'vol0:/bundles/firmware_logo.okpkg',
  },
  {
    key: 'images',
    label: 'Images',
    fileNamePrefix: 'images',
    devicePath: 'vol0:/bundles/images/images.okpkg',
  },
  {
    key: 'animation',
    label: 'Animation',
    fileNamePrefix: 'animation',
    devicePath: 'vol0:/bundles/images/animation.okpkg',
  },
  {
    key: 'wallpaper',
    label: 'Wallpaper',
    fileNamePrefix: 'wallpaper',
    devicePath: 'vol0:/bundles/images/wallpaper.okpkg',
  },
  {
    key: 'translations',
    label: 'Translations',
    fileNamePrefix: 'translations',
    devicePath: 'vol0:/bundles/translations/translations.okpkg',
  },
  {
    key: 'fonts_roobert',
    label: 'Fonts Roobert',
    fileNamePrefix: 'roobert',
    devicePath: 'vol0:/bundles/font/roobert.okpkg',
  },
  {
    key: 'fonts_noto',
    label: 'Fonts Noto',
    fileNamePrefix: 'noto',
    devicePath: 'vol0:/bundles/font/noto.okpkg',
  },
  {
    key: 'boot_resource',
    label: 'Boot Resource',
    fileNamePrefix: 'boot_resource',
    devicePath: 'vol0:/loaders/bootloader/boot_resource.okpkg.staging',
  },
  {
    key: 'params',
    label: 'Params',
    fileNamePrefix: 'params',
    devicePath: 'vol0:/loaders/rom/params.okpkg',
  },
];

export function getProtocolV2FirmwareTargets(deviceType: string) {
  if (deviceType === EDeviceType.Pro2) return PROTOCOL_V2_FIRMWARE_TARGETS;
  return PROTOCOL_V2_FIRMWARE_TARGETS.filter(
    target => target.param !== 'se03Binary' && target.param !== 'se04Binary'
  );
}

export function findProtocolV2ResourceSlot(fileName: string) {
  const normalizedFileName = fileName.toLowerCase();
  return PROTOCOL_V2_RESOURCE_SLOTS.find(({ fileNamePrefix }) => {
    const normalizedPrefix = fileNamePrefix.toLowerCase();
    return (
      normalizedFileName === `${normalizedPrefix}.okpkg` ||
      normalizedFileName.startsWith(`${normalizedPrefix}-resource-`)
    );
  });
}

export type ProtocolV2ResourceDirectoryInspection<T extends { name: string }> = {
  matchedFiles: Partial<Record<string, T>>;
  missingSlots: ProtocolV2ResourceSlot[];
  duplicateSlots: Array<{ slot: ProtocolV2ResourceSlot; files: T[] }>;
  unrecognizedFiles: T[];
};

export function inspectProtocolV2ResourcePackageDirectory<T extends { name: string }>(
  selectedFiles: readonly T[]
): ProtocolV2ResourceDirectoryInspection<T> {
  const packageFiles = selectedFiles.filter(file => file.name.toLowerCase().endsWith('.okpkg'));
  const matchedFiles: Partial<Record<string, T>> = {};
  const missingSlots: ProtocolV2ResourceSlot[] = [];
  const duplicateSlots: Array<{ slot: ProtocolV2ResourceSlot; files: T[] }> = [];

  for (const slot of PROTOCOL_V2_RESOURCE_SLOTS) {
    const matches = packageFiles.filter(
      file => findProtocolV2ResourceSlot(file.name)?.key === slot.key
    );
    if (matches.length === 0) missingSlots.push(slot);
    else if (matches.length > 1) duplicateSlots.push({ slot, files: matches });
    else {
      const [matchedFile] = matches;
      matchedFiles[slot.key] = matchedFile;
    }
  }

  return {
    matchedFiles,
    missingSlots,
    duplicateSlots,
    unrecognizedFiles: packageFiles.filter(file => !findProtocolV2ResourceSlot(file.name)),
  };
}

export function matchProtocolV2ResourcePackageDirectory<T extends { name: string }>(
  selectedFiles: readonly T[]
): Record<string, T> {
  const inspection = inspectProtocolV2ResourcePackageDirectory(selectedFiles);
  if (inspection.missingSlots.length > 0) {
    throw new Error(`Missing resource package: ${inspection.missingSlots[0].label}`);
  }
  if (inspection.duplicateSlots.length > 0) {
    throw new Error(`Duplicate resource package: ${inspection.duplicateSlots[0].slot.label}`);
  }
  return inspection.matchedFiles as Record<string, T>;
}
