import { HardwareErrorCode, enrichErrorMessage } from '@onekeyfe/hwk-adapter-core';

import type { Failure } from '@onekeyfe/hwk-adapter-core';

// `_tag` survives errorToFailure → re-throw so SDK classifiers keep working.
export type LedgerFailure = Omit<Failure, 'payload'> & {
  payload: Failure['payload'] & { appName?: string; _tag?: string };
};

export interface WrapErrorOptions {
  /** Fallback when err has no `appName` (DMK signer errors don't carry it). */
  defaultAppName?: string;
}

export function ledgerFailure(
  code: HardwareErrorCode,
  error: string,
  appName?: string,
  tag?: string,
  params?: Record<string, unknown>
): LedgerFailure {
  const payload: LedgerFailure['payload'] = { error, code };
  if (appName !== undefined) payload.appName = appName;
  if (tag !== undefined) payload._tag = tag;
  if (params !== undefined) payload.params = params;
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
 * DMK step value emitted when SignTransactionDeviceAction retries with
 * basic/blind signing. Used to distinguish APDU 0x6a80 ("Invalid data")
 * caused by a blind-sign fallback from a generic malformed transaction.
 */
const STEP_BLIND_SIGN_TRANSACTION_FALLBACK = 'signer.eth.steps.blindSignTransactionFallback';

/**
 * Read the Ledger Ethereum App APDU error code from a DMK error object.
 * Returns the code in lowercase (e.g. "6a80") or `null` if not present.
 */
function getEthAppErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  if (e._tag === ERROR_TAG.EthAppCommand && typeof e.errorCode === 'string') {
    return e.errorCode.toLowerCase();
  }
  const orig = e.originalError as Record<string, unknown> | undefined;
  if (orig?._tag === ERROR_TAG.EthAppCommand && typeof orig.errorCode === 'string') {
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
 * Map unambiguous Ledger Ethereum App APDU status words to HardwareErrorCode.
 * Ambiguous status words, such as 0x6a80, are classified with full error
 * context in `classifyEthAppError`.
 */
function mapEthAppErrorCode(ethCode: string): HardwareErrorCode | null {
  switch (ethCode) {
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

function classifyEthAppError(err: unknown): HardwareErrorCode | null {
  const ethCode = getEthAppErrorCode(err);
  if (!ethCode) return null;

  // 0x6a80 is a broad "Invalid data" APDU. Only report blind-signing
  // guidance when DMK actually entered the blind-sign fallback branch.
  if (ethCode === '6a80') {
    return hasBlindSignFallbackStep(err) ? HardwareErrorCode.EvmBlindSigningRequired : null;
  }

  return mapEthAppErrorCode(ethCode);
}

// Centralized `_tag` constants — single source of truth for both writes and
// classifier comparisons. Typos fail at compile time.
export const ERROR_TAG = {
  // SDK-mint
  DeviceNotAdvertising: 'DeviceNotAdvertisingError', // BLE scan miss
  DeviceNotInDiscoveryCache: 'DeviceNotInDiscoveryCacheError', // dm.connect() before enumerate
  BlePairingTimeout: 'BlePairingTimeoutError', // SMP 30s timeout
  BleGattBondingFailed: 'BleGattBondingFailedError', // other GATT failure
  UserAborted: 'UserAborted',
  DeviceAppStuck: 'DeviceAppStuck', // chain app wedged (APDU 0x6901)
  DeviceTransportStuck: 'DeviceTransportStuck', // DMK transport queue wedged

  // DMK-reuse (DMK throws same string; we synthesize too)
  DeviceLocked: 'DeviceLockedError',
  DeviceNotRecognized: 'DeviceNotRecognizedError',
  DeviceSessionNotFound: 'DeviceSessionNotFound',
  OpenAppCommand: 'OpenAppCommandError',

  // DMK-only (read only)
  EthAppCommand: 'EthAppCommandError',
  UserRefusedOnDevice: 'UserRefusedOnDevice',
  WrongAppOpened: 'WrongAppOpenedError',
  InvalidStatusWord: 'InvalidStatusWordError',
  AlreadySendingApdu: 'AlreadySendingApduError',
  UnknownDeviceExchange: 'UnknownDeviceExchangeError',
  NoAccessibleDevice: 'NoAccessibleDeviceError',
  UnknownDevice: 'UnknownDeviceError',
  DeviceSessionRefresher: 'DeviceSessionRefresherError',
  DeviceNotInitialized: 'DeviceNotInitializedError',
  OpeningConnection: 'OpeningConnectionError',
  DeviceDisconnectedBeforeSendingApdu: 'DeviceDisconnectedBeforeSendingApdu',
  DeviceDisconnectedWhileSending: 'DeviceDisconnectedWhileSendingError',
  Disconnect: 'DisconnectError',
  ReconnectionFailed: 'ReconnectionFailedError',
  WebHIDDisconnect: 'WebHIDDisconnectError',
  // ble-plx surfaces this when GATT notification setup fails — typical
  // outcome when the user doesn't confirm pairing on the device, or the
  // existing bond is invalid. Observed in production after ~30s.
  PairingRefused: 'PairingRefusedError',
} as const;

export type SdkErrorTag = (typeof ERROR_TAG)[keyof typeof ERROR_TAG];

// Strict: only SE-locked. DeviceNotAdvertising / BlePairingTimeout etc are
// their own classifiers — don't conflate.
export function isDeviceLockedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e.errorCode != null && LOCKED_ERROR_CODES.has(String(e.errorCode))) return true;
  if (e.statusCode != null && LOCKED_ERROR_CODES.has(String(e.statusCode))) return true;
  if (e._tag === ERROR_TAG.DeviceLocked) return true;
  if (e.originalError != null && isDeviceLockedError(e.originalError)) return true;
  if (e.error != null && e._tag && isDeviceLockedError(e.error)) return true;
  return false;
}

// BLE scan miss — peripheral not seen, recoverable via unlock prompt.
export function isDeviceNotAdvertisingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (err as { _tag?: string })._tag === ERROR_TAG.DeviceNotAdvertising;
}

// GATT bonding failed (non-timeout). Not auto-retryable.
export function isBleGattBondingFailedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (err as { _tag?: string })._tag === ERROR_TAG.BleGattBondingFailed;
}

// Any BLE pairing failure (DMK-native, ble-plx, our own). All map to
// `code: BlePairingTimeout` so batch fail-closes uniformly. User-cancel of
// the system pairing dialog also lands here — to the user it's the same
// "didn't pair" outcome, no need to disambiguate.
const PAIRING_FAILURE_TAGS = new Set<string>([
  ERROR_TAG.BlePairingTimeout,
  ERROR_TAG.BleGattBondingFailed,
  ERROR_TAG.PairingRefused,
]);
export function isBlePairingFailureError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const tag = (err as { _tag?: string })._tag;
  if (tag && PAIRING_FAILURE_TAGS.has(tag)) return true;
  const orig = (err as { originalError?: unknown }).originalError;
  if (orig != null && isBlePairingFailureError(orig)) return true;
  return false;
}

// "Connection is broken" — next call can't reuse the session. Used by
// Layer 2 fail-closed gate.
const CONNECTION_LEVEL_TAGS: Set<string> = new Set([
  ERROR_TAG.DeviceLocked,
  ERROR_TAG.DeviceNotAdvertising,
  ERROR_TAG.BlePairingTimeout,
  ERROR_TAG.BleGattBondingFailed,
  ERROR_TAG.PairingRefused,
  ERROR_TAG.DeviceNotRecognized,
  ERROR_TAG.NoAccessibleDevice,
  ERROR_TAG.UnknownDevice,
  ERROR_TAG.DeviceSessionNotFound,
  ERROR_TAG.DeviceSessionRefresher,
  ERROR_TAG.DeviceNotInitialized,
  ERROR_TAG.OpeningConnection,
  ERROR_TAG.DeviceDisconnectedBeforeSendingApdu,
  ERROR_TAG.DeviceDisconnectedWhileSending,
  ERROR_TAG.Disconnect,
  ERROR_TAG.ReconnectionFailed,
  ERROR_TAG.WebHIDDisconnect,
]);

const DEVICE_NOT_FOUND_TAGS: Set<string> = new Set([
  ERROR_TAG.NoAccessibleDevice,
  ERROR_TAG.UnknownDevice,
  ERROR_TAG.DeviceNotInitialized,
  // SDK-internal: dm.connect() called before _discovered was populated.
  // Map to DeviceNotFound so non-BLE-direct paths get a sensible error code.
  ERROR_TAG.DeviceNotInDiscoveryCache,
]);

const DEVICE_BUSY_TAGS: Set<string> = new Set([ERROR_TAG.OpeningConnection]);

const DEVICE_DISCONNECTED_TAGS: Set<string> = new Set([
  ERROR_TAG.DeviceNotRecognized,
  ERROR_TAG.DeviceSessionNotFound,
  ERROR_TAG.DeviceSessionRefresher,
  ERROR_TAG.DeviceDisconnectedBeforeSendingApdu,
  ERROR_TAG.DeviceDisconnectedWhileSending,
  ERROR_TAG.Disconnect,
  ERROR_TAG.ReconnectionFailed,
  ERROR_TAG.WebHIDDisconnect,
]);

export function isConnectionLevelError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const tag = (err as { _tag?: string })._tag;
  if (tag && CONNECTION_LEVEL_TAGS.has(tag)) return true;
  // Recurse into nested DMK error envelopes (originalError / error.{_tag})
  const e = err as Record<string, unknown>;
  if (e.originalError != null && isConnectionLevelError(e.originalError)) return true;
  if (e.error != null && e._tag && isConnectionLevelError(e.error)) return true;
  return false;
}

/** Expose for connector — used to decide whether to pass an error through
 *  unchanged or wrap as BleGattBondingFailed. */
export function isKnownConnectionTag(tag: unknown): boolean {
  return typeof tag === 'string' && CONNECTION_LEVEL_TAGS.has(tag);
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

function hasBlindSignFallbackStep(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;

  if (e._lastStep === STEP_BLIND_SIGN_TRANSACTION_FALLBACK) return true;

  if (
    Array.isArray(e._deviceActionSteps) &&
    e._deviceActionSteps.includes(STEP_BLIND_SIGN_TRANSACTION_FALLBACK)
  ) {
    return true;
  }

  if (e.originalError != null && hasBlindSignFallbackStep(e.originalError)) return true;
  if (e.error != null && e._tag && hasBlindSignFallbackStep(e.error)) return true;
  return false;
}

function isDeviceNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const tag = (err as { _tag?: string })._tag;
  if (tag && DEVICE_NOT_FOUND_TAGS.has(tag)) return true;
  const e = err as Record<string, unknown>;
  if (e.originalError != null && isDeviceNotFoundError(e.originalError)) return true;
  if (e.error != null && e._tag && isDeviceNotFoundError(e.error)) return true;
  return false;
}

function isDeviceBusyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const tag = (err as { _tag?: string })._tag;
  if (tag && DEVICE_BUSY_TAGS.has(tag)) return true;
  const e = err as Record<string, unknown>;
  if (e.originalError != null && isDeviceBusyError(e.originalError)) return true;
  if (e.error != null && e._tag && isDeviceBusyError(e.error)) return true;
  return false;
}

/** Check for user rejection (denied on device). */
export function isUserRejectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === ERROR_TAG.UserRefusedOnDevice) return true;
  if (typeof e.message === 'string' && /denied|rejected|refused/i.test(e.message)) return true;
  if (hasStatusCode(err, USER_REJECTED_CODES)) return true;
  return false;
}

/** Check for wrong app open on the device. */
export function isWrongAppError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === ERROR_TAG.WrongAppOpened || e._tag === ERROR_TAG.InvalidStatusWord) {
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

/** Check for app not installed on device. */
export function isAppNotInstalledError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (typeof e.message === 'string' && /unknown application/i.test(e.message)) return true;
  if (hasStatusCode(err, APP_NOT_INSTALLED_CODES)) return true;
  return false;
}

/** DMK install ran out of space on the device. */
export function isOutOfMemoryError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e._tag === 'OutOfMemoryDAError') return true;
  if (typeof e.message === 'string' && /out of memory|not enough.*space|insufficient.*memory/i.test(e.message)) {
    return true;
  }
  return false;
}

/** Check for device disconnected errors. */
export function isDeviceDisconnectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const tag = e._tag;
  if (typeof tag === 'string' && DEVICE_DISCONNECTED_TAGS.has(tag)) return true;
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

/** Chain app wedged: APDU 0x6901 — only the user pressing both buttons recovers. */
export function isAppStuckByApdu(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const tag = (err as Record<string, unknown>)._tag;
  if (tag === ERROR_TAG.DeviceAppStuck) return true; // already wrapped form
  return extractApduHex(err) === '6901';
}

/** DMK transport / IntentQueue slot wedged — recover via connector.reset(). */
export function isTransportStuck(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const tag = (err as Record<string, unknown>)._tag;
  return (
    tag === ERROR_TAG.DeviceTransportStuck || // already wrapped form
    tag === ERROR_TAG.UnknownDeviceExchange ||
    tag === ERROR_TAG.AlreadySendingApdu
  );
}

/** Union: any stuck state, regardless of root cause. Used by Layer 2 catch. */
export function isStuckAppStateError(err: unknown): boolean {
  return isAppStuckByApdu(err) || isTransportStuck(err);
}

/**
 * Map a Ledger DMK error to a HardwareErrorCode and human-readable message.
 * `opts.defaultAppName` fills `appName` when the raw error doesn't carry it
 * (DMK signer errors don't).
 */
export function mapLedgerError(
  err: unknown,
  opts?: WrapErrorOptions
): {
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

  // DeviceLocked: _tag handoff (unlock-device) or APDU 0x5515/0x6982.
  if (isDeviceLockedError(err)) {
    code = HardwareErrorCode.DeviceLocked;
  } else if (isDeviceNotAdvertisingError(err) || isDeviceNotFoundError(err)) {
    code = HardwareErrorCode.DeviceNotFound;
  } else if (isDeviceBusyError(err)) {
    code = HardwareErrorCode.DeviceBusy;
  } else if (isBlePairingFailureError(err)) {
    code = HardwareErrorCode.BlePairingTimeout;
  } else if (isUserRejectedError(err)) {
    // User rejection (0x6985) must win over EthAppError mapping — a user-cancelled
    // blind-sign is not a "please enable Blind signing" situation.
    code = HardwareErrorCode.UserRejected;
  } else if (isWrongAppError(err)) {
    code = HardwareErrorCode.WrongApp;
  } else if (isAppNotInstalledError(err)) {
    code = HardwareErrorCode.AppNotInstalled;
  } else if (isOutOfMemoryError(err)) {
    code = HardwareErrorCode.DeviceOutOfMemory;
  } else if (isDeviceDisconnectedError(err)) {
    code = HardwareErrorCode.DeviceDisconnected;
  } else if (isTimeoutError(err)) {
    code = HardwareErrorCode.OperationTimeout;
  } else {
    const ethMapped = classifyEthAppError(err);

    // Solana / Tron / BTC APDU codes — disjoint from EVM's table, single-pass lookup.
    const apduHex = ethMapped ? null : extractApduHex(err);
    const chainMapped = apduHex
      ? mapSolanaAppError(apduHex) ?? mapTronAppError(apduHex) ?? mapBtcAppError(apduHex)
      : null;

    code = ethMapped ?? chainMapped ?? HardwareErrorCode.UnknownError;
  }

  const errAppName =
    err && typeof err === 'object'
      ? ((err as Record<string, unknown>).appName as string | undefined)
      : undefined;
  const appName = errAppName ?? opts?.defaultAppName;

  return { code, message: enrichErrorMessage(code, originalMessage), appName };
}
