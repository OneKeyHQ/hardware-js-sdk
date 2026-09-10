import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import { Status } from '@keystonehq/hw-transport-error';

import type { HwkError, HwkErrorOrigin } from '@onekeyfe/hwk-adapter-core';

/**
 * Device-side rejections (`Status` values reported inside a JSON response
 * payload's status word) — see EAPDU_Readme.md in the Keystone USB SDK repo.
 */
const DEVICE_STATUS_MAP: Partial<Record<number, HardwareErrorCode>> = {
  [Status.PRS_PARSING_REJECTED]: HardwareErrorCode.UserRejected,
  [Status.PRS_PARSING_DISALLOWED]: HardwareErrorCode.DeviceLocked,
  [Status.PRS_PARSING_MISMATCHED_WALLET]: HardwareErrorCode.DeviceMismatch,
  [Status.PRS_EXPORT_ADDRESS_REJECTED]: HardwareErrorCode.UserRejected,
  [Status.PRS_EXPORT_ADDRESS_DISALLOWED]: HardwareErrorCode.DeviceLocked,
};

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
    const deviceCode = DEVICE_STATUS_MAP[statusCode];
    const code = deviceCode ?? CLIENT_STATUS_MAP[statusCode] ?? HardwareErrorCode.TransportError;
    let origin: HwkErrorOrigin | undefined;
    if (deviceCode !== undefined) {
      origin = 'device';
    } else if (code !== HardwareErrorCode.OperationTimeout) {
      origin = 'transport';
    }
    return createHwkError({
      code,
      message,
      // A DEVICE_STATUS_MAP hit is the firmware answering (rejection, locked,
      // mismatched wallet) — a result, never a link problem. Client-side
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
