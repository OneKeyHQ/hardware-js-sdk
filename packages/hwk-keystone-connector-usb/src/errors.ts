import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import { Status } from '@keystonehq/hw-transport-error';

import type { HwkError, HwkErrorOrigin } from '@onekeyfe/hwk-adapter-core';

/**
 * Firmware status words are the low end of `Status` (0..15); client codes start at
 * `ERR_DEVICE_NOT_OPENED` (0xA0000001), so anything below came from a device response frame.
 */
function isDeviceStatus(statusCode: number): boolean {
  return statusCode >= 0 && statusCode < Status.ERR_DEVICE_NOT_OPENED;
}

/** Firmware status words from a device response (EAPDU_Readme.md in the Keystone USB SDK). */
const DEVICE_STATUS_MAP: Partial<Record<number, HardwareErrorCode>> = {
  [Status.RSP_FAILURE_CODE]: HardwareErrorCode.UnknownError,
  [Status.PRS_INVALID_TOTAL_PACKETS]: HardwareErrorCode.InvalidParams,
  [Status.PRS_INVALID_INDEX]: HardwareErrorCode.InvalidParams,
  [Status.PRS_PARSING_REJECTED]: HardwareErrorCode.UserRejected,
  [Status.PRS_PARSING_ERROR]: HardwareErrorCode.InvalidParams,
  [Status.PRS_PARSING_DISALLOWED]: HardwareErrorCode.DeviceLocked,
  [Status.PRS_PARSING_UNMATCHED]: HardwareErrorCode.InvalidParams,
  [Status.PRS_PARSING_MISMATCHED_WALLET]: HardwareErrorCode.DeviceMismatch,
  [Status.PRS_PARSING_VERIFY_PASSWORD_ERROR]: HardwareErrorCode.PinInvalid,
  [Status.PRS_EXPORT_ADDRESS_UNSUPPORTED_CHAIN]: HardwareErrorCode.ChainNotSupported,
  [Status.PRS_EXPORT_ADDRESS_INVALID_PARAMS]: HardwareErrorCode.InvalidParams,
  [Status.PRS_EXPORT_ADDRESS_ERROR]: HardwareErrorCode.UnknownError,
  [Status.PRS_EXPORT_ADDRESS_DISALLOWED]: HardwareErrorCode.DeviceLocked,
  [Status.PRS_EXPORT_ADDRESS_REJECTED]: HardwareErrorCode.UserRejected,
  [Status.PRS_EXPORT_ADDRESS_BUSY]: HardwareErrorCode.DeviceBusyInternal,
};

/** Used when the transport forwarded only its 'unknown error' placeholder for a firmware status. */
const DEVICE_STATUS_MESSAGE: Partial<Record<number, string>> = {
  [Status.RSP_FAILURE_CODE]: 'Keystone reported a failure',
  [Status.PRS_INVALID_TOTAL_PACKETS]: 'Keystone rejected the request framing (total packets)',
  [Status.PRS_INVALID_INDEX]: 'Keystone rejected the request framing (packet index)',
  [Status.PRS_PARSING_REJECTED]: 'Rejected on the Keystone screen',
  [Status.PRS_PARSING_ERROR]: 'Keystone could not parse the request',
  [Status.PRS_PARSING_DISALLOWED]: 'Keystone declined the request in its current state',
  [Status.PRS_PARSING_UNMATCHED]: 'Keystone found no handler for the request',
  [Status.PRS_PARSING_MISMATCHED_WALLET]: 'The request belongs to a different Keystone wallet',
  [Status.PRS_PARSING_VERIFY_PASSWORD_ERROR]: 'Keystone password verification failed',
  [Status.PRS_EXPORT_ADDRESS_UNSUPPORTED_CHAIN]: 'Keystone does not support this chain',
  [Status.PRS_EXPORT_ADDRESS_INVALID_PARAMS]: 'Keystone rejected the address export parameters',
  [Status.PRS_EXPORT_ADDRESS_ERROR]: 'Keystone failed to export the address',
  [Status.PRS_EXPORT_ADDRESS_DISALLOWED]: 'Keystone declined to export the address',
  [Status.PRS_EXPORT_ADDRESS_REJECTED]: 'Address export rejected on the Keystone screen',
  [Status.PRS_EXPORT_ADDRESS_BUSY]: 'Keystone is busy with another request',
};

/** The placeholder both Keystone transports use when they have nothing better. */
const PLACEHOLDER_MESSAGE = /^unknown error\b/i;

/** Client-side (transport/framing) failures, never reached the device. */
const CLIENT_STATUS_MAP: Partial<Record<number, HardwareErrorCode>> = {
  [Status.ERR_DEVICE_NOT_OPENED]: HardwareErrorCode.DeviceNotFound,
  [Status.ERR_DEVICE_NOT_FOUND]: HardwareErrorCode.DeviceNotFound,
  [Status.ERR_TIMEOUT]: HardwareErrorCode.OperationTimeout,
  [Status.ERR_DATA_TOO_LARGE]: HardwareErrorCode.PayloadTooLarge,
  [Status.ERR_NOT_SUPPORTED]: HardwareErrorCode.TransportNotAvailable,
};

/** WebUSB DOMExceptions; an unplug or bus reset mid-call is the common case. */
const DOM_EXCEPTION_MAP = new Map<string, { code: HardwareErrorCode; origin: HwkErrorOrigin }>([
  ['NotFoundError', { code: HardwareErrorCode.DeviceNotFound, origin: 'transport' }],
  ['NetworkError', { code: HardwareErrorCode.DeviceNotFound, origin: 'transport' }],
  ['SecurityError', { code: HardwareErrorCode.DevicePermissionDenied, origin: 'host' }],
  ['NotAllowedError', { code: HardwareErrorCode.DevicePermissionDenied, origin: 'host' }],
  ['InvalidStateError', { code: HardwareErrorCode.DeviceBusy, origin: 'transport' }],
  ['AbortError', { code: HardwareErrorCode.DeviceBusy, origin: 'transport' }],
]);

/**
 * Maps a Keystone USB SDK failure to `HardwareErrorCode`. Fields are read duck-typed because
 * duplicate `@keystonehq/*` module instances break `instanceof`.
 */
export function mapKeystoneUsbError(err: unknown): HwkError {
  const fields: { name?: unknown; code?: unknown; transportErrorCode?: unknown } =
    err && typeof err === 'object' ? err : {};
  const domName = typeof fields.name === 'string' ? fields.name : undefined;

  // Only five-digit codes are HWK codes; legacy DOMException codes (NotFoundError
  // is 8) must not pass through as hardware errors.
  if (typeof fields.code === 'number' && fields.code >= 10000 && fields.code <= 99999) {
    return err as HwkError;
  }

  const statusCode =
    typeof fields.transportErrorCode === 'number' ? fields.transportErrorCode : undefined;

  const message = err instanceof Error ? err.message : String(err);

  if (statusCode !== undefined) {
    const fromDevice = isDeviceStatus(statusCode);
    // An unlisted firmware status keeps origin 'device'; 'transport' would make the
    // adapter tear down a live session over an on-device decline.
    const code = fromDevice
      ? DEVICE_STATUS_MAP[statusCode] ?? HardwareErrorCode.UnknownError
      : CLIENT_STATUS_MAP[statusCode] ?? HardwareErrorCode.TransportError;
    let origin: HwkErrorOrigin | undefined;
    if (fromDevice) {
      origin = 'device';
    } else if (code !== HardwareErrorCode.OperationTimeout) {
      origin = 'transport';
    }
    const description = DEVICE_STATUS_MESSAGE[statusCode];
    return createHwkError({
      code,
      // The device's own payload text wins over the table.
      message:
        description && PLACEHOLDER_MESSAGE.test(message)
          ? `${description} (error_code: ${statusCode})`
          : message,
      // A timeout may be either side, so it stays unlabeled.
      origin,
      params: { statusCode, details: (err as { details?: string }).details },
    });
  }

  const domMapping = domName ? DOM_EXCEPTION_MAP.get(domName) : undefined;
  if (domMapping) {
    return createHwkError({ ...domMapping, message, params: { domExceptionName: domName } });
  }

  // This mapper only wraps transport calls, so 'transport' names the throw site.
  return createHwkError({ code: HardwareErrorCode.TransportError, message, origin: 'transport' });
}
