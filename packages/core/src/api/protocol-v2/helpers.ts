import { DevRebootType, DeviceRebootType } from '@onekeyfe/hd-transport';

import { invalidParameter, validateNonEmptyString } from '../helpers/filesystemValidation';

import type {
  DevFirmwareTarget,
  DevFirmwareTargetType,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

export type RebootTypeInput =
  | DevRebootType
  | DeviceRebootType
  | keyof typeof DevRebootType
  | keyof typeof DeviceRebootType
  | string
  | number;

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

const DEV_REBOOT_TYPES: Record<string, DevRebootType> = {
  Normal: DevRebootType.Normal,
  normal: DevRebootType.Normal,
  Romloader: DevRebootType.Boardloader,
  romloader: DevRebootType.Boardloader,
  Boardloader: DevRebootType.Boardloader,
  boardloader: DevRebootType.Boardloader,
  Bootloader: DevRebootType.Bootloader,
  bootloader: DevRebootType.Bootloader,
};

const DEVICE_REBOOT_TYPES: Record<string, DeviceRebootType> = {
  Normal: DeviceRebootType.Normal,
  normal: DeviceRebootType.Normal,
  Romloader: DeviceRebootType.Romloader,
  romloader: DeviceRebootType.Romloader,
  Boardloader: DeviceRebootType.Romloader,
  boardloader: DeviceRebootType.Romloader,
  Bootloader: DeviceRebootType.Bootloader,
  bootloader: DeviceRebootType.Bootloader,
};

export const PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS: TransportCallOptions = {
  intermediateTypes: ['DevFirmwareInstallProgress'],
};

export const PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES: (
  | 'Success'
  | 'DevFirmwareUpdateStatus'
)[] = ['Success', 'DevFirmwareUpdateStatus'];

export const getProtocolV2UnknownErrorText = (error: unknown) => {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }

  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.name, error.message);
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    for (const field of ['name', 'message', 'reason', 'code', 'errorCode', 'nativeErrorCode']) {
      const value = record[field];
      if (value !== undefined && value !== null) {
        parts.push(String(value));
      }
    }
  }

  const stringified = String(error);
  if (stringified && stringified !== '[object Object]') {
    parts.push(stringified);
  }

  return parts.filter(Boolean).join(' ');
};

export const isProtocolV2DeviceDisconnectedError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  const compactMessage = message.replace(/\s+/g, '');
  return (
    message.includes('notfounderror') ||
    (message.includes("failed to execute 'open'") && message.includes('usbdevice')) ||
    message.includes('device was disconnected') ||
    message.includes('device disconnected') ||
    message.includes('device disconnect') ||
    message.includes('was disconnected') ||
    message.includes('bledevicedisconnected') ||
    message.includes('bleconnectederror') ||
    message.includes('connected error is always runtime error') ||
    message.includes('connection has timed out unexpectedly') ||
    message.includes('connection error has occured') ||
    message.includes('connection error has occurred') ||
    message.includes('transferIn') ||
    message.includes('transferin') ||
    message.includes('usbdevice') ||
    message.includes('multiplatformbleadapter') ||
    message.includes('multipalformebleadapter') ||
    compactMessage.includes('rxerrorerror6') ||
    message.includes('rxerror error 6')
  );
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

export function normalizeDeviceRebootType(
  value: RebootTypeInput | undefined
): DeviceRebootType {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    if (value in DEVICE_REBOOT_TYPES) return DEVICE_REBOOT_TYPES[value];
  }
  return DeviceRebootType.Normal;
}

// 当前 firmware-pro2 子模块的 DevFirmwareTargetType 合法值。
const VALID_FIRMWARE_TARGET_IDS = new Set<number>([0, 1, 2, 3, 4, 5, 6, 10]);

function normalizeTargetId(
  value: DevFirmwareTargetType | string | number | undefined,
  name: string
): DevFirmwareTargetType {
  if (value === undefined || value === null) {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  // 校验值域：仅接受 DevFirmwareTargetType 中定义的 target id，
  // 不再放行任意非负整数。
  if (Number.isSafeInteger(numeric) && VALID_FIRMWARE_TARGET_IDS.has(numeric)) {
    return numeric as DevFirmwareTargetType;
  }
  throw invalidParameter(
    `Parameter [${name}] must be a valid firmware target id (one of ${[
      ...VALID_FIRMWARE_TARGET_IDS,
    ].join(', ')}).`
  );
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
