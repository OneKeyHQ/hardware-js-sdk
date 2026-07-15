import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

export const invalidParameter = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);

export function validateNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidParameter(`Parameter [${name}] is required and must be a non-empty string.`);
  }
  return value;
}

export function validateNonNegativeInteger(
  value: unknown,
  name: string,
  defaultValue?: number
): number {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) return defaultValue;
    throw invalidParameter(`Missing required parameter: ${name}`);
  }

  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isSafeInteger(numeric) || numeric < 0) {
    throw invalidParameter(`Parameter [${name}] must be a non-negative integer.`);
  }
  return numeric;
}

export function validateOptionalNonNegativeInteger(
  value: unknown,
  name: string
): number | undefined {
  if (value === undefined || value === null) return undefined;
  return validateNonNegativeInteger(value, name);
}

export function validateOptionalPercentage(value: unknown, name: string): number | undefined {
  const numeric = validateOptionalNonNegativeInteger(value, name);
  if (numeric === undefined) return undefined;
  if (numeric > 100) {
    throw invalidParameter(`Parameter [${name}] must be between 0 and 100.`);
  }
  return numeric;
}

export function validateRequiredData(value: unknown, name: string): void {
  if (value === undefined || value === null) {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
}
