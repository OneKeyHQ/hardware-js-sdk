import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import { Status } from '@keystonehq/hw-transport-error';

import type { HwkError } from '@onekeyfe/hwk-adapter-core';

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
 * Maps a Keystone USB SDK failure to the shared `HardwareErrorCode`
 * vocabulary. Every device-side rejection and client-side transport failure
 * the SDK produces is a *thrown* `TransportError` with a numeric
 * `transportErrorCode` (see `@keystonehq/hw-transport-error`) — this is
 * called from every `catch` in `KeystoneUsbConnectorBase` to build the
 * `ConnectorCallResult` data-not-exception shape `IConnector.call` requires.
 *
 * Idempotent: an error `KeystoneUsbConnectorBase` already built via
 * `createHwkError` (e.g. its own `DeviceMismatch`/`DeviceNotFound` checks)
 * carries a numeric `.code` already and passes straight through unchanged —
 * without this it would fall through to the generic `TransportError`
 * fallback below and silently lose the real code, since `HwkError` uses
 * `.code`, not the raw SDK's `.transportErrorCode`.
 *
 * Reads `transportErrorCode` duck-typed rather than `instanceof
 * TransportError` — cheap defense against the exact-same class of
 * cross-package duplicate-module-instance bug already hit once in this
 * integration (see docs/design/keystone-integration), where two copies of a
 * `@keystonehq/*` package resolve to different physical files and
 * `instanceof` silently fails across them.
 */
export function mapKeystoneUsbError(err: unknown): HwkError {
  if (err && typeof err === 'object' && typeof (err as { code?: unknown }).code === 'number') {
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
    const code =
      DEVICE_STATUS_MAP[statusCode] ??
      CLIENT_STATUS_MAP[statusCode] ??
      HardwareErrorCode.TransportError;
    return createHwkError({
      code,
      message,
      params: { statusCode, details: (err as { details?: string }).details },
    });
  }

  return createHwkError({ code: HardwareErrorCode.TransportError, message });
}
