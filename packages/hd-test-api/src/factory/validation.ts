import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type {
  DeviceFactoryCertificateWriteParams,
  DeviceFactoryChallengeSignParams,
  DeviceFactoryInfoSetParams,
} from './types';

const invalidParameter = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);

const validateNonEmptyString = (value: unknown, name: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidParameter(`Parameter [${name}] is required and must be a non-empty string.`);
  }
  return value.trim();
};

const getUtf8ByteLength = (value: string) =>
  Array.from(value).reduce((length, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) return length + 1;
    if (codePoint <= 0x7ff) return length + 2;
    if (codePoint <= 0xffff) return length + 3;
    return length + 4;
  }, 0);

const validateIntegerInRange = (value: unknown, name: string, minimum: number, maximum: number) => {
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
) => {
  const hex = validateNonEmptyString(value, name);
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

export const validateDeviceFactoryInfoSetParams = (
  payload: Partial<DeviceFactoryInfoSetParams>
): DeviceFactoryInfoSetParams => {
  const serialNumber = validateNonEmptyString(payload.serial_number, 'serial_number');
  if (getUtf8ByteLength(serialNumber) > 24) {
    throw invalidParameter('Parameter [serial_number] must not exceed 24 UTF-8 bytes.');
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
  const date = new Date(
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
    date.getUTCFullYear() !== manufactureTime.year ||
    date.getUTCMonth() + 1 !== manufactureTime.month ||
    date.getUTCDate() !== manufactureTime.day
  ) {
    throw invalidParameter('Parameter [manufacture_time] must be a valid calendar date.');
  }
  if (typeof payload.burn_in_completed !== 'boolean') {
    throw invalidParameter('Parameter [burn_in_completed] is required and must be a boolean.');
  }
  if (typeof payload.factory_test_completed !== 'boolean') {
    throw invalidParameter('Parameter [factory_test_completed] is required and must be a boolean.');
  }
  return {
    version: validateIntegerInRange(payload.version, 'version', 0, 255),
    serial_number: serialNumber,
    burn_in_completed: payload.burn_in_completed,
    factory_test_completed: payload.factory_test_completed,
    manufacture_time: manufactureTime,
  };
};

export const validateDeviceFactoryCertificateWriteParams = (
  payload: Partial<DeviceFactoryCertificateWriteParams>
): DeviceFactoryCertificateWriteParams => ({
  certificate: validateHexBytes(payload.certificate, 'certificate', { maxBytes: 512 }),
  ...(payload.privateKey === undefined
    ? {}
    : { privateKey: validateHexBytes(payload.privateKey, 'privateKey', { exactBytes: 32 }) }),
});

export const validateDeviceFactoryChallengeSignParams = (
  payload: Partial<DeviceFactoryChallengeSignParams>
): DeviceFactoryChallengeSignParams => ({
  digest: validateHexBytes(payload.digest, 'digest', { exactBytes: 32 }),
});
