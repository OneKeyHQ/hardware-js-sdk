import { HardwareErrorCode, enrichErrorMessage } from '@onekeyfe/hwk-adapter-core';

import type { Failure } from '@onekeyfe/hwk-adapter-core';

/**
 * Ledger-specific Failure: adds `appName` for "the currently-open app" — a
 * Ledger hardware concept not shared with other vendors, so it lives here
 * rather than in core's generic Failure.
 */
export type LedgerFailure = Omit<Failure, 'payload'> & {
  payload: Failure['payload'] & { appName?: string };
};

/**
 * Structurally compatible with `Failure`; writes `appName` only when provided,
 * so `'appName' in payload` is a reliable "has info" signal for consumers.
 */
export function ledgerFailure(
  code: HardwareErrorCode,
  error: string,
  appName?: string
): LedgerFailure {
  const payload: LedgerFailure['payload'] = { error, code };
  if (appName !== undefined) payload.appName = appName;
  return { success: false, payload };
}

/**
 * DMK locked device status codes:
 *   0x5515 (21781) — primary locked response
 *   0x6982 (27010) — security status not satisfied
 *   0x5303 (21251) — tertiary locked response
 */
const LOCKED_ERROR_CODES = new Set(['5515', '21781', '6982', '27010', '5303', '21251']);

/**
 * DMK user-rejected status codes:
 *   0x6985 (27013) — conditions of use not satisfied (user denied on device)
 */
const USER_REJECTED_CODES = new Set(['6985', '27013']);

/**
 * DMK wrong-app / CLA-not-supported status codes:
 *   0x6e00 (28160) — CLA not supported (wrong app open)
 *   0x6d00 (27904) — INS not supported (wrong app or outdated app)
 *   0x6a83 (27267) — Referenced data not found (wrong app for raw APDU, e.g. TRON)
 */
const WRONG_APP_CODES = new Set(['6e00', '28160', '6d00', '27904', '6a83', '27267']);

/**
 * DMK app-not-installed status codes:
 *   0x6807 (26631) — Unknown application name (app not installed on device)
 */
const APP_NOT_INSTALLED_CODES = new Set(['6807', '26631']);

/**
 * DMK step value emitted just before a blind-sign failure.
 * Used to distinguish APDU 0x6a80 ("Invalid data") caused by disabled
 * Blind signing vs. a genuinely malformed transaction.
 */
const STEP_BLIND_SIGN_FALLBACK = 'signer.eth.steps.blindSignTransactionFallback';

/**
 * Read the Ledger Ethereum App APDU error code from a DMK error object.
 * Returns the code in lowercase (e.g. "6a80") or `null` if not present.
 */
function getEthAppErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  if (e._tag === 'EthAppCommandError' && typeof e.errorCode === 'string') {
    return e.errorCode.toLowerCase();
  }
  const orig = e.originalError as Record<string, unknown> | undefined;
  if (orig?._tag === 'EthAppCommandError' && typeof orig.errorCode === 'string') {
    return orig.errorCode.toLowerCase();
  }
  return null;
}

/**
 * Extract an APDU status word in lowercase hex. Handles DMK's hex-string
 * `errorCode`, legacy TransportStatusError's numeric `statusCode`, and
 * recurses through `originalError` for wrapped errors.
 */
function extractApduHex(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  if (typeof e.errorCode === 'string' && /^[0-9a-f]+$/i.test(e.errorCode)) {
    return e.errorCode.toLowerCase();
  }
  if (typeof e.statusCode === 'number' && Number.isFinite(e.statusCode)) {
    return e.statusCode.toString(16).padStart(4, '0');
  }
  if (typeof e.statusCode === 'string' && /^[0-9a-f]+$/i.test(e.statusCode)) {
    return e.statusCode.toLowerCase();
  }
  if (e.originalError != null) {
    const nested = extractApduHex(e.originalError);
    if (nested) return nested;
  }
  if (e.error != null && typeof e._tag === 'string') {
    const nested = extractApduHex(e.error);
    if (nested) return nested;
  }
  return null;
}

/** Solana APDU → code. 0x6808 arrives as a plain DeviceExchangeError,
 *  not wrapped in SolanaAppCommandError, so match by code only. */
function mapSolanaAppError(hex: string): HardwareErrorCode | null {
  switch (hex) {
    case '6808':
      return HardwareErrorCode.SolanaBlindSigningRequired;
    default:
      return null;
  }
}

/** Tron APDU → code. Source: app-tron/src/app_errors.h (E_MISSING_SETTING_*). */
function mapTronAppError(hex: string): HardwareErrorCode | null {
  switch (hex) {
    case '6a8d':
      return HardwareErrorCode.TronCustomContractRequired;
    case '6a8b':
      return HardwareErrorCode.TronDataSigningRequired;
    case '6a8c':
      return HardwareErrorCode.TronSignByHashRequired;
    default:
      return null;
  }
}

/** BTC APDU → code. 0xb000 range is disjoint from other apps' 0x6xxx. */
function mapBtcAppError(hex: string): HardwareErrorCode | null {
  switch (hex) {
    case 'b008':
      return HardwareErrorCode.BtcWalletPolicyHmacMismatch;
    case 'b007':
      return HardwareErrorCode.BtcUnexpectedState;
    default:
      return null;
  }
}

/**
 * Map a Ledger Ethereum App APDU status word to a HardwareErrorCode.
 * `lastStep` (attached by `deviceActionToPromise`) is used only to refine
 * ambiguous codes like 0x6a80.
 */
function mapEthAppError(ethCode: string, lastStep: string | undefined): HardwareErrorCode | null {
  switch (ethCode) {
    case '6a80':
      // "Invalid data". If DMK had just fallen back to blind signing, the
      // only plausible cause is that Blind signing is disabled on the device.
      if (lastStep === STEP_BLIND_SIGN_FALLBACK) {
        return HardwareErrorCode.EvmBlindSigningRequired;
      }
      // Other call sites (e.g. clear-sign with malformed context) — keep
      // unknown so the raw message surfaces and the bug can be diagnosed.
      return null;
    case '6984':
      return HardwareErrorCode.EvmClearSignPluginMissing;
    case '6a84':
      return HardwareErrorCode.EvmDataTooLarge;
    case '6501':
      return HardwareErrorCode.EvmTxTypeNotSupported;
    case '911c':
      return HardwareErrorCode.AppTooOld;
    default:
      return null;
  }
}

/** Check if an error (or any error in its chain) represents a locked Ledger device. */
export function isDeviceLockedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e.errorCode != null && LOCKED_ERROR_CODES.has(String(e.errorCode))) return true;
  if (e.statusCode != null && LOCKED_ERROR_CODES.has(String(e.statusCode))) return true;
  if (e._tag === 'DeviceLockedError') return true;
  if (e.originalError != null && isDeviceLockedError(e.originalError)) return true;
  if (e.error != null && e._tag && isDeviceLockedError(e.error)) return true;
  return false;
}

/** Check if a status/error code exists in the given set, crawling the error chain. */
function hasStatusCode(err: unknown, codeSet: Set<string>): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e.errorCode != null && codeSet.has(String(e.errorCode))) return true;
  if (e.statusCode != null && codeSet.has(String(e.statusCode))) return true;
  if (e.originalError != null && hasStatusCode(e.originalError, codeSet)) return true;
  if (e.error != null && e._tag && hasStatusCode(e.error, codeSet)) return true;
  return false;
}

/** Check for user rejection (denied on device). */
export function isUserRejectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === 'UserRefusedOnDevice') return true;
  if (typeof e.message === 'string' && /denied|rejected|refused/i.test(e.message)) return true;
  if (hasStatusCode(err, USER_REJECTED_CODES)) return true;
  return false;
}

/** Check for wrong app open on the device. */
export function isWrongAppError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === 'WrongAppOpenedError' || e._tag === 'InvalidStatusWordError') {
    if (hasStatusCode(err, WRONG_APP_CODES)) return true;
  }
  if (typeof e.message === 'string') {
    const msg = e.message.toLowerCase();
    if (msg.includes('wrong app') || msg.includes('open the') || msg.includes('cla not supported'))
      return true;
  }
  if (hasStatusCode(err, WRONG_APP_CODES)) return true;
  return false;
}

/** Check for app not installed on device (OpenAppCommand returns 0x6807). */
export function isAppNotInstalledError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === 'OpenAppCommandError') return true;
  if (typeof e.message === 'string' && /unknown application/i.test(e.message)) return true;
  if (hasStatusCode(err, APP_NOT_INSTALLED_CODES)) return true;
  return false;
}

/** Check for device disconnected errors. */
export function isDeviceDisconnectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === 'DeviceNotRecognizedError' || e._tag === 'DeviceSessionNotFound') return true;
  if (typeof e.message === 'string') {
    const msg = e.message.toLowerCase();
    if (
      msg.includes('disconnected') ||
      msg.includes('not found') ||
      msg.includes('no device') ||
      msg.includes('unplugged')
    )
      return true;
  }
  return false;
}

/**
 * DMK timeout error _tag values.
 * These are the concrete error classes from @ledgerhq/device-management-kit.
 */
const TIMEOUT_TAGS = new Set([
  'DeviceExchangeTimeoutError',
  'SendApduTimeoutError',
  'SendCommandTimeoutError',
]);

/** Check for timeout errors using DMK's _tag identifiers or wrapped error code. */
export function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (typeof e._tag === 'string' && TIMEOUT_TAGS.has(e._tag)) return true;
  if (e.code === HardwareErrorCode.OperationTimeout) return true;
  return false;
}

/**
 * Map a Ledger DMK error to a HardwareErrorCode and human-readable message
 * with actionable recovery information for the caller.
 */
export function mapLedgerError(err: unknown): {
  code: HardwareErrorCode;
  message: string;
  appName?: string;
} {
  // Order matters: check more specific errors first

  // Extract the original message for fallback / enrichment
  let originalMessage = 'Unknown Ledger error';
  if (err instanceof Error) {
    originalMessage = err.message;
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    originalMessage = String(e.message ?? e._tag ?? e.type ?? JSON.stringify(err));
  }

  let code: HardwareErrorCode;

  if (isDeviceLockedError(err)) {
    code = HardwareErrorCode.DeviceLocked;
  } else if (isUserRejectedError(err)) {
    // User rejection (0x6985) must win over EthAppError mapping — a user-cancelled
    // blind-sign is not a "please enable Blind signing" situation.
    code = HardwareErrorCode.UserRejected;
  } else if (isWrongAppError(err)) {
    code = HardwareErrorCode.WrongApp;
  } else if (isAppNotInstalledError(err)) {
    code = HardwareErrorCode.AppNotOpen;
  } else if (isDeviceDisconnectedError(err)) {
    code = HardwareErrorCode.DeviceDisconnected;
  } else if (isTimeoutError(err)) {
    code = HardwareErrorCode.OperationTimeout;
  } else {
    // Ethereum App APDU-specific classification (uses _lastStep attached by
    // deviceActionToPromise to disambiguate 0x6a80).
    const ethCode = getEthAppErrorCode(err);
    const lastStep =
      err && typeof err === 'object'
        ? ((err as Record<string, unknown>)._lastStep as string | undefined)
        : undefined;
    const ethMapped = ethCode ? mapEthAppError(ethCode, lastStep) : null;

    // Solana / Tron / BTC APDU codes — disjoint from EVM's table, single-pass lookup.
    const apduHex = ethMapped ? null : extractApduHex(err);
    const chainMapped = apduHex
      ? mapSolanaAppError(apduHex) ?? mapTronAppError(apduHex) ?? mapBtcAppError(apduHex)
      : null;

    code = ethMapped ?? chainMapped ?? HardwareErrorCode.UnknownError;
  }

  const appName =
    err && typeof err === 'object'
      ? ((err as Record<string, unknown>).appName as string | undefined)
      : undefined;

  return { code, message: enrichErrorMessage(code, originalMessage), appName };
}
