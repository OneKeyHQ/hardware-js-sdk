import { DevRebootType } from '@onekeyfe/hd-transport';

import type {
  DevFirmwareTarget,
  DevFirmwareTargetType,
  DevInfoTargets,
  DevInfoTypes,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

export type RebootTypeInput = DevRebootType | keyof typeof DevRebootType | string | number;

export type DevRebootParams = {
  rebootType?: RebootTypeInput;
  reboot_type?: RebootTypeInput;
};

export type DevGetDeviceInfoParams = {
  targets?: DevInfoTargets;
  types?: DevInfoTypes;
  targetHw?: boolean;
  targetFw?: boolean;
  targetBt?: boolean;
  targetSe1?: boolean;
  targetSe2?: boolean;
  targetSe3?: boolean;
  targetSe4?: boolean;
  targetStatus?: boolean;
  includeVersion?: boolean;
  includeBuildId?: boolean;
  includeHash?: boolean;
  includeSpecific?: boolean;
};

export type DevFirmwareTargetInput =
  | DevFirmwareTarget
  | {
      targetId?: DevFirmwareTargetType | string | number;
      target_id?: DevFirmwareTargetType | string | number;
      path: string;
    };

export type DevFirmwareUpdateParams = {
  targets?: DevFirmwareTargetInput[];
  targetId?: DevFirmwareTargetType | string | number;
  target_id?: DevFirmwareTargetType | string | number;
  path?: string;
};

export type FactoryDeviceInfoSettingsParams = {
  serial_no?: string;
  serialNo?: string;
  cpu_info?: string;
  cpuInfo?: string;
  pre_firmware?: string;
  preFirmware?: string;
};

const DEV_REBOOT_TYPES: Record<string, DevRebootType> = {
  Normal: DevRebootType.Normal,
  normal: DevRebootType.Normal,
  Boardloader: DevRebootType.Boardloader,
  boardloader: DevRebootType.Boardloader,
  Bootloader: DevRebootType.Bootloader,
  bootloader: DevRebootType.Bootloader,
};

export const PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS: TransportCallOptions = {
  intermediateTypes: ['DevFirmwareInstallProgress'],
};

export function normalizeRebootType(value: RebootTypeInput | undefined): DevRebootType {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    if (value in DEV_REBOOT_TYPES) return DEV_REBOOT_TYPES[value];
  }
  return DevRebootType.Normal;
}

function normalizeTargetId(
  value: DevFirmwareTargetType | string | number | undefined
): DevFirmwareTargetType {
  if (typeof value === 'number') return value;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return 0;
}

export function normalizeFirmwareTargets(params: DevFirmwareUpdateParams): DevFirmwareTarget[] {
  const targets =
    params.targets ??
    (params.path
      ? [
          {
            target_id: params.target_id ?? params.targetId ?? 0,
            path: params.path,
          },
        ]
      : []);

  return targets.map(target => ({
    target_id: normalizeTargetId('target_id' in target ? target.target_id : target.targetId),
    path: target.path,
  }));
}

export function buildTargets(params: DevGetDeviceInfoParams): DevInfoTargets | undefined {
  if (params.targets) return params.targets;

  const targets: DevInfoTargets = {
    hw: params.targetHw,
    fw: params.targetFw,
    bt: params.targetBt,
    se1: params.targetSe1,
    se2: params.targetSe2,
    se3: params.targetSe3,
    se4: params.targetSe4,
    status: params.targetStatus,
  };
  return Object.values(targets).some(value => value !== undefined) ? targets : undefined;
}

export function buildTypes(params: DevGetDeviceInfoParams): DevInfoTypes | undefined {
  if (params.types) return params.types;

  const types: DevInfoTypes = {
    version: params.includeVersion,
    build_id: params.includeBuildId,
    hash: params.includeHash,
    specific: params.includeSpecific,
  };
  return Object.values(types).some(value => value !== undefined) ? types : undefined;
}
