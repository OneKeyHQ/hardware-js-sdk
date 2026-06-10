import { DevRebootType } from '@onekeyfe/hd-transport';

import { invalidParameter, validateNonEmptyString } from '../helpers/filesystemValidation';

import type {
  DevFirmwareTarget,
  DevFirmwareTargetType,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

export type RebootTypeInput = DevRebootType | keyof typeof DevRebootType | string | number;

export type DeviceRebootParams = {
  rebootType?: RebootTypeInput;
  reboot_type?: RebootTypeInput;
};

export type DeviceFirmwareTargetInput =
  | DevFirmwareTarget
  | {
      targetId?: DevFirmwareTargetType | string | number;
      target_id?: DevFirmwareTargetType | string | number;
      path: string;
    };

export type DeviceFirmwareUpdateParams = {
  targets?: DeviceFirmwareTargetInput[];
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

const DEVICE_REBOOT_TYPES: Record<string, DevRebootType> = {
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

export const PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES: ('Success' | 'DevFirmwareUpdateStatus')[] =
  ['Success', 'DevFirmwareUpdateStatus'];

export function normalizeRebootType(value: RebootTypeInput | undefined): DevRebootType {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    if (value in DEVICE_REBOOT_TYPES) return DEVICE_REBOOT_TYPES[value];
  }
  return DevRebootType.Normal;
}

function normalizeTargetId(
  value: DevFirmwareTargetType | string | number | undefined,
  name: string
): DevFirmwareTargetType {
  if (value === undefined || value === null) {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value >= 0) return value;
    throw invalidParameter(`Parameter [${name}] must be a valid firmware target id.`);
  }
  const numeric = Number(value);
  if (Number.isSafeInteger(numeric) && numeric >= 0) return numeric;
  throw invalidParameter(`Parameter [${name}] must be a valid firmware target id.`);
}

export function normalizeFirmwareTargets(params: DeviceFirmwareUpdateParams): DevFirmwareTarget[] {
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

  if (!Array.isArray(targets) || targets.length === 0) {
    throw invalidParameter('Parameter [targets] must contain at least one firmware target.');
  }

  return targets.map((target, index) => {
    if (!target || typeof target !== 'object') {
      throw invalidParameter(`Parameter [targets.${index}] must be an object.`);
    }
    const targetId = target.target_id ?? target.targetId;
    return {
      target_id: normalizeTargetId(targetId, `targets.${index}.target_id`),
      path: validateNonEmptyString(target.path, `targets.${index}.path`),
    };
  });
}
