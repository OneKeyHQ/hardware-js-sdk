import { DeviceRebootType } from '@onekeyfe/hd-transport';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { invalidParameter, validateNonEmptyString } from '../helpers/filesystemValidation';
import { ProtocolV2FirmwareTargetType } from '../../protocols/protocol-v2/firmware';

import type {
  DeviceFirmwareTarget,
  DeviceFirmwareTargetType,
  DeviceFirmwareUpdateRecordFields,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

export type RebootTypeInput = DeviceRebootType | keyof typeof DeviceRebootType | string | number;

export type DeviceRebootParams = {
  rebootType?: RebootTypeInput;
  reboot_type?: RebootTypeInput;
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

export type DeviceFirmwareUpdateStatusGetParams = {
  fields?: DeviceFirmwareUpdateRecordFields;
};

export type DeviceFactoryInfoSetParams = {
  version?: number;
  serial_number?: string;
  burn_in_completed?: boolean;
  factory_test_completed?: boolean;
  manufacture_time?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
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
  intermediateTypes: ['DeviceFirmwareUpdateStatus'],
};

export const PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES: (
  | 'Success'
  | 'DeviceFirmwareUpdateStatus'
)[] = ['Success', 'DeviceFirmwareUpdateStatus'];

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
  const errorCode =
    error && typeof error === 'object'
      ? (error as { errorCode?: number; code?: number }).errorCode ??
        (error as { errorCode?: number; code?: number }).code
      : undefined;
  if (errorCode === HardwareErrorCode.BleDeviceDisconnected) return true;

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
    message.includes('react native ble transport released') ||
    message.includes('multiplatformbleadapter') ||
    message.includes('multipalformebleadapter') ||
    compactMessage.includes('rxerrorerror6') ||
    message.includes('rxerror error 6')
  );
};

export function normalizeRebootType(value: RebootTypeInput | undefined): DeviceRebootType {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    if (value in DEVICE_REBOOT_TYPES) return DEVICE_REBOOT_TYPES[value];
  }
  return DeviceRebootType.Normal;
}

// 与 firmware-pro2 的 proto_target_to_firmware_target 安装白名单保持一致。
const INSTALLABLE_FIRMWARE_TARGET_IDS = new Set<number>([
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03,
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04,
]);
const FIRMWARE_TARGET_ID_BY_NAME = new Map<string, DeviceFirmwareTargetType>(
  Object.entries(ProtocolV2FirmwareTargetType).flatMap(([key, value]) =>
    INSTALLABLE_FIRMWARE_TARGET_IDS.has(value) ? [[key, value as DeviceFirmwareTargetType]] : []
  )
);

function normalizeTargetId(
  value: DeviceFirmwareTargetType | string | number | undefined,
  name: string
): DeviceFirmwareTargetType {
  if (value === undefined || value === null) {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
  const named = typeof value === 'string' ? FIRMWARE_TARGET_ID_BY_NAME.get(value) : undefined;
  const numeric = named ?? (typeof value === 'number' ? value : Number(value));
  if (Number.isSafeInteger(numeric) && INSTALLABLE_FIRMWARE_TARGET_IDS.has(numeric)) {
    return numeric as DeviceFirmwareTargetType;
  }
  throw invalidParameter(
    `Parameter [${name}] must be an installable firmware target id (one of ${[
      ...INSTALLABLE_FIRMWARE_TARGET_IDS,
    ].join(', ')}).`
  );
}

export function normalizeFirmwareTargets(
  params: DeviceFirmwareUpdateParams
): DeviceFirmwareTarget[] {
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
