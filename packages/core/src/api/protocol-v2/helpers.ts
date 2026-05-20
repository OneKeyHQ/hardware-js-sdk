import { DeviceRebootType } from '@onekeyfe/hd-transport';

import type {
  DeviceFirmwareTarget,
  DeviceFirmwareTargetType,
  DeviceInfoTargets,
  DeviceInfoTypes,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

export type RebootTypeInput = DeviceRebootType | keyof typeof DeviceRebootType | string | number;

export type DeviceRebootParams = {
  rebootType?: RebootTypeInput;
  reboot_type?: RebootTypeInput;
};

export type DeviceGetDeviceInfoParams = {
  targets?: DeviceInfoTargets;
  types?: DeviceInfoTypes;
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

export type DeviceFirmwareTargetInput =
  | DeviceFirmwareTarget
  | {
      targetId?: DeviceFirmwareTargetType | string | number;
      target_id?: DeviceFirmwareTargetType | string | number;
      path: string;
    };

export type DeviceFirmwareUpdateParams = {
  targets?: DeviceFirmwareTargetInput[];
  targetId?: DeviceFirmwareTargetType | string | number;
  target_id?: DeviceFirmwareTargetType | string | number;
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

const DEVICE_REBOOT_TYPES: Record<string, DeviceRebootType> = {
  Normal: DeviceRebootType.Normal,
  normal: DeviceRebootType.Normal,
  Boardloader: DeviceRebootType.Boardloader,
  boardloader: DeviceRebootType.Boardloader,
  Bootloader: DeviceRebootType.Bootloader,
  bootloader: DeviceRebootType.Bootloader,
};

export const PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS: TransportCallOptions = {
  intermediateTypes: ['DeviceFirmwareInstallProgress'],
};

export const PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES: ('Success' | 'DeviceFirmwareUpdateStatus')[] =
  ['Success', 'DeviceFirmwareUpdateStatus'];

export function normalizeRebootType(value: RebootTypeInput | undefined): DeviceRebootType {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    if (value in DEVICE_REBOOT_TYPES) return DEVICE_REBOOT_TYPES[value];
  }
  return DeviceRebootType.Normal;
}

function normalizeTargetId(
  value: DeviceFirmwareTargetType | string | number | undefined
): DeviceFirmwareTargetType {
  if (typeof value === 'number') return value;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return 0;
}

export function normalizeFirmwareTargets(params: DeviceFirmwareUpdateParams): DeviceFirmwareTarget[] {
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

export function buildTargets(params: DeviceGetDeviceInfoParams): DeviceInfoTargets | undefined {
  if (params.targets) return params.targets;

  const targets: DeviceInfoTargets = {
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

export function buildTypes(params: DeviceGetDeviceInfoParams): DeviceInfoTypes | undefined {
  if (params.types) return params.types;

  const types: DeviceInfoTypes = {
    version: params.includeVersion,
    build_id: params.includeBuildId,
    hash: params.includeHash,
    specific: params.includeSpecific,
  };
  return Object.values(types).some(value => value !== undefined) ? types : undefined;
}
