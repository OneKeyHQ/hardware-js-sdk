import { DeviceRebootType } from '@onekeyfe/hd-transport';

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
  version: number;
  serial_number: string;
  burn_in_completed: boolean;
  factory_test_completed: boolean;
  manufacture_time: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
};

export type DeviceFactoryCertificateWriteParams = {
  certificate: string;
  privateKey?: string;
};

export type DeviceFactoryChallengeSignParams = {
  digest: string;
};

const FACTORY_SERIAL_MAX_UTF8_BYTES = 24;
const FACTORY_CERTIFICATE_MAX_BYTES = 512;
const FACTORY_PRIVATE_KEY_BYTES = 32;
const FACTORY_CHALLENGE_DIGEST_BYTES = 32;

const getUtf8ByteLength = (value: string) =>
  Array.from(value).reduce((length, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) return length + 1;
    if (codePoint <= 0x7ff) return length + 2;
    if (codePoint <= 0xffff) return length + 3;
    return length + 4;
  }, 0);

const validateRequiredBoolean = (value: unknown, name: string): boolean => {
  if (typeof value !== 'boolean') {
    throw invalidParameter(`Parameter [${name}] is required and must be a boolean.`);
  }
  return value;
};

const validateIntegerInRange = (
  value: unknown,
  name: string,
  minimum: number,
  maximum: number
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw invalidParameter(
      `Parameter [${name}] must be an integer between ${minimum} and ${maximum}.`
    );
  }
  return value;
};

const validateHexBytes = (
  value: unknown,
  name: string,
  options: { exactBytes?: number; maxBytes?: number }
): string => {
  const hex = validateNonEmptyString(value, name).trim();
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex)) {
    throw invalidParameter(`Parameter [${name}] must be an even-length hexadecimal string.`);
  }
  const byteLength = hex.length / 2;
  if (options.exactBytes !== undefined && byteLength !== options.exactBytes) {
    throw invalidParameter(`Parameter [${name}] must contain exactly ${options.exactBytes} bytes.`);
  }
  if (options.maxBytes !== undefined && byteLength > options.maxBytes) {
    throw invalidParameter(`Parameter [${name}] must not exceed ${options.maxBytes} bytes.`);
  }
  return hex;
};

export function validateDeviceFactoryInfoSetParams(
  payload: Partial<DeviceFactoryInfoSetParams>
): DeviceFactoryInfoSetParams {
  const serialNumber = validateNonEmptyString(payload.serial_number, 'serial_number').trim();
  if (getUtf8ByteLength(serialNumber) > FACTORY_SERIAL_MAX_UTF8_BYTES) {
    throw invalidParameter(
      `Parameter [serial_number] must not exceed ${FACTORY_SERIAL_MAX_UTF8_BYTES} UTF-8 bytes.`
    );
  }

  const time = payload.manufacture_time;
  if (!time || typeof time !== 'object') {
    throw invalidParameter('Parameter [manufacture_time] is required.');
  }
  const manufactureTime = {
    year: validateIntegerInRange(time.year, 'manufacture_time.year', 2000, 9999),
    month: validateIntegerInRange(time.month, 'manufacture_time.month', 1, 12),
    day: validateIntegerInRange(time.day, 'manufacture_time.day', 1, 31),
    hour: validateIntegerInRange(time.hour, 'manufacture_time.hour', 0, 23),
    minute: validateIntegerInRange(time.minute, 'manufacture_time.minute', 0, 59),
    second: validateIntegerInRange(time.second, 'manufacture_time.second', 0, 59),
  };
  const normalizedDate = new Date(
    Date.UTC(
      manufactureTime.year,
      manufactureTime.month - 1,
      manufactureTime.day,
      manufactureTime.hour,
      manufactureTime.minute,
      manufactureTime.second
    )
  );
  if (
    normalizedDate.getUTCFullYear() !== manufactureTime.year ||
    normalizedDate.getUTCMonth() + 1 !== manufactureTime.month ||
    normalizedDate.getUTCDate() !== manufactureTime.day
  ) {
    throw invalidParameter('Parameter [manufacture_time] must be a valid calendar date.');
  }

  return {
    version: validateIntegerInRange(payload.version, 'version', 0, 255),
    serial_number: serialNumber,
    burn_in_completed: validateRequiredBoolean(payload.burn_in_completed, 'burn_in_completed'),
    factory_test_completed: validateRequiredBoolean(
      payload.factory_test_completed,
      'factory_test_completed'
    ),
    manufacture_time: manufactureTime,
  };
}

export function validateDeviceFactoryCertificateWriteParams(
  payload: Partial<DeviceFactoryCertificateWriteParams>
): DeviceFactoryCertificateWriteParams {
  return {
    certificate: validateHexBytes(payload.certificate, 'certificate', {
      maxBytes: FACTORY_CERTIFICATE_MAX_BYTES,
    }),
    ...(payload.privateKey === undefined
      ? {}
      : {
          privateKey: validateHexBytes(payload.privateKey, 'privateKey', {
            exactBytes: FACTORY_PRIVATE_KEY_BYTES,
          }),
        }),
  };
}

export function validateDeviceFactoryChallengeSignParams(
  payload: Partial<DeviceFactoryChallengeSignParams>
): DeviceFactoryChallengeSignParams {
  return {
    digest: validateHexBytes(payload.digest, 'digest', {
      exactBytes: FACTORY_CHALLENGE_DIGEST_BYTES,
    }),
  };
}

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
  ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_CRATE,
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
