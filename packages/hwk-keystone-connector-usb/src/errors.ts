import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import { Status } from '@keystonehq/hw-transport-error';

import type { HwkError, HwkErrorOrigin } from '@onekeyfe/hwk-adapter-core';

/**
 * Firmware status words occupy the low end of `Status` (0..15 today); client
 * codes start at `ERR_DEVICE_NOT_OPENED` (0xA0000001). Anything below that
 * boundary arrived inside a device response frame — see
 * `@keystonehq/hw-transport-webusb`, which throws
 * `TransportError(payload, result.status)` for every non-zero response status.
 */
function isDeviceStatus(statusCode: number): boolean {
  return statusCode >= 0 && statusCode < Status.ERR_DEVICE_NOT_OPENED;
}

/**
 * Device-side outcomes (`Status` values reported inside a JSON response
 * payload's status word) — see EAPDU_Readme.md in the Keystone USB SDK repo.
 */
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

/**
 * The Keystone transport only names client-side codes (its `ErrorInfo`); for a
 * firmware status it forwards the device's response payload and falls back to a
 * bare 'unknown error'. These fill that gap when the device sent no text.
 */
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

/** Client-side (transport/framing) failures — never reached the device. */
const CLIENT_STATUS_MAP: Partial<Record<number, HardwareErrorCode>> = {
  [Status.ERR_DEVICE_NOT_OPENED]: HardwareErrorCode.DeviceNotFound,
  [Status.ERR_DEVICE_NOT_FOUND]: HardwareErrorCode.DeviceNotFound,
  [Status.ERR_TIMEOUT]: HardwareErrorCode.OperationTimeout,
  [Status.ERR_DATA_TOO_LARGE]: HardwareErrorCode.PayloadTooLarge,
  [Status.ERR_NOT_SUPPORTED]: HardwareErrorCode.TransportNotAvailable,
};

/**
 * Maps a Keystone USB SDK failure to `HardwareErrorCode`. Errors that already
 * carry a numeric `.code` pass through unchanged. `transportErrorCode` is read
 * duck-typed because duplicate `@keystonehq/*` module instances break
 * `instanceof`.
 */
export function mapKeystoneUsbError(err: unknown): HwkError {
  const domName =
    err && typeof err === 'object' && typeof (err as { name?: unknown }).name === 'string'
      ? (err as { name: string }).name
      : undefined;

  // Legacy DOMException codes overlap the low-numbered browser error table
  // (for example NotFoundError is 8). Only five-digit HWK codes are already
  // mapped errors; letting any numeric `.code` pass through turns a WebUSB
  // disconnect into an unknown hardware error at the app boundary.
  if (
    err &&
    typeof err === 'object' &&
    typeof (err as { code?: unknown }).code === 'number' &&
    (err as { code: number }).code >= 10000 &&
    (err as { code: number }).code <= 99999
  ) {
    return err as HwkError;
  }

  const statusCode =
    err &&
    typeof err === 'object' &&
    typeof (err as { transportErrorCode?: unknown }).transportErrorCode === 'number'
      ? (err as { transportErrorCode: number }).transportErrorCode
      : undefined;

  const message = err instanceof Error ? err.message : String(err);

  if (statusCode !== undefined) {
    const fromDevice = isDeviceStatus(statusCode);
    // An unlisted firmware status is still the firmware answering, so it keeps
    // 'device' and only the code degrades. Guessing 'transport' there is what
    // makes KeystoneAdapter tear down a live USB session over an on-device
    // decline, and a real pipe death already arrives via the transport's
    // disconnect listener rather than a status word.
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
      // The device's own payload text wins; the table only covers the case
      // where the transport had nothing to forward.
      message:
        description && PLACEHOLDER_MESSAGE.test(message)
          ? `${description} (error_code: ${statusCode})`
          : message,
      // A firmware status word is a result, never a link problem. Client-side
      // status codes came from the framing/pipe layer — EXCEPT the timeout,
      // which is genuinely two-faced (the device may be sitting on a confirm
      // screen waiting for a human, or the pipe may be dead) and stays
      // unlabeled rather than mislabeled.
      origin,
      params: { statusCode, details: (err as { details?: string }).details },
    });
  }

  // WebUSB failures are DOMExceptions. The device dropping off the bus
  // mid-call is the common one — every command here is its own
  // open/claim/transfer/release/close cycle, so an unplug or a bus reset lands
  // exactly here — and it deserves a message the user can act on.
  if (domName === 'NotFoundError' || domName === 'NetworkError') {
    return createHwkError({
      code: HardwareErrorCode.DeviceNotFound,
      message,
      origin: 'transport',
      params: { domExceptionName: domName },
    });
  }
  if (domName === 'SecurityError' || domName === 'NotAllowedError') {
    return createHwkError({
      code: HardwareErrorCode.DevicePermissionDenied,
      message,
      origin: 'host',
      params: { domExceptionName: domName },
    });
  }
  if (domName === 'InvalidStateError' || domName === 'AbortError') {
    return createHwkError({
      code: HardwareErrorCode.DeviceBusy,
      message,
      origin: 'transport',
      params: { domExceptionName: domName },
    });
  }

  // Anything else that reached this mapper was thrown by the transport layer
  // (this function only wraps USB transport calls), so 'transport' is a fact
  // about the throw site, not a guess about the cause.
  return createHwkError({ code: HardwareErrorCode.TransportError, message, origin: 'transport' });
}
