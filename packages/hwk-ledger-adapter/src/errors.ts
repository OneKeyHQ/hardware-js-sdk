import {
  HardwareErrorCode,
  defaultOriginForCode,
  defaultRecoveryForCode,
  enrichErrorMessage,
} from '@onekeyfe/hwk-adapter-core';

import type { Failure, HwkErrorOrigin, HwkRecoveryHint } from '@onekeyfe/hwk-adapter-core';

export const MULTIPLE_USB_LEDGER_DEVICES_ERROR_MESSAGE =
  'Multiple Ledger USB devices are connected. Please connect only one Ledger device and try again.';

export function createMultipleUsbLedgerDevicesError(): Error & { code: HardwareErrorCode } {
  return Object.assign(new Error(MULTIPLE_USB_LEDGER_DEVICES_ERROR_MESSAGE), {
    code: HardwareErrorCode.DeviceOneDeviceOnly,
  });
}

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
  params?: Record<string, unknown>,
  origin?: HwkErrorOrigin,
  recovery?: HwkRecoveryHint
): LedgerFailure {
  const payload: LedgerFailure['payload'] = { error, code };
  if (appName !== undefined) payload.appName = appName;
  if (tag !== undefined) payload._tag = tag;
  if (params !== undefined) payload.params = params;
  const resolvedOrigin = origin ?? defaultOriginForCode(code);
  if (resolvedOrigin !== undefined) payload.origin = resolvedOrigin;
  payload.recovery = recovery ?? defaultRecoveryForCode(code);
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
const STEP_DETECT_BLIND_SIGNING = 'signer.eth.steps.detectBlindSigning';
const BLIND_SIGNING_STEPS = new Set([
  STEP_BLIND_SIGN_TRANSACTION_FALLBACK,
  STEP_DETECT_BLIND_SIGNING,
]);

function normalizeApduHex(value: unknown): string | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffff) {
    return value.toString(16).padStart(4, '0');
  }
  if (typeof value !== 'string') return null;
  const raw = value.toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]{1,4}$/i.test(raw) ? raw.padStart(4, '0') : null;
}

/**
 * Read the Ledger Ethereum App APDU error code from a DMK error object.
 * Returns the code in lowercase (e.g. "6a80") or `null` if not present.
 */
function getEthAppErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  if (e._tag === ERROR_TAG.EthAppCommand) {
    const code =
      normalizeApduHex(e.errorCode) ?? normalizeApduHex(e.statusCode) ?? normalizeApduHex(e.code);
    if (code) return code;
  }
  const orig = e.originalError as Record<string, unknown> | undefined;
  if (orig?._tag === ERROR_TAG.EthAppCommand) {
    return (
      normalizeApduHex(orig.errorCode) ??
      normalizeApduHex(orig.statusCode) ??
      normalizeApduHex(orig.code)
    );
  }
  return null;
}

/**
 * Extract an APDU status word in lowercase hex. Handles DMK's hex-string
 * `errorCode`, numeric `statusCode`, and recurses through
 * `originalError` for wrapped errors.
 */
function extractApduHex(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  const direct = normalizeApduHex(e.errorCode) ?? normalizeApduHex(e.statusCode);
  if (direct) return direct;
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
  // guidance when DMK actually entered the blind-signing flow.
  if (ethCode === '6a80') {
    return hasBlindSigningStep(err) ? HardwareErrorCode.EvmBlindSigningRequired : null;
  }

  return mapEthAppErrorCode(ethCode);
}

function classifyBlindSigningDetectionError(err: unknown): HardwareErrorCode | null {
  if (!hasBlindSigningStep(err)) return null;
  if (hasInvalidArgumentCode(err)) return HardwareErrorCode.EvmBlindSigningRequired;
  return null;
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
  // installApp resolved success but the app is still missing on device —
  // DMK quirk. Surfaced as a distinct tag so callers can tell it apart from
  // the original DMK-thrown AppNotInstalled.
  AppInstallVerifyFailed: 'AppInstallVerifyFailedError',

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
  // DMK's class is named OpeningConnectionError but its `_tag` reads
  // "ConnectionOpeningError" — and its typings widen `_tag` to `string`, which
  // is why the class name looked authoritative. Both spellings are kept so a
  // DMK version that aligns them does not silently drop back to UnknownError.
  OpeningConnection: 'ConnectionOpeningError',
  OpeningConnectionLegacy: 'OpeningConnectionError',
  DeviceDisconnectedBeforeSendingApdu: 'DeviceDisconnectedBeforeSendingApdu',
  DeviceDisconnectedWhileSending: 'DeviceDisconnectedWhileSendingError',
  Disconnect: 'DisconnectError',
  ReconnectionFailed: 'ReconnectionFailedError',
  WebHIDDisconnect: 'WebHIDDisconnectError',
  // ble-plx surfaces this when GATT notification setup fails — typical
  // outcome when the user doesn't confirm pairing on the device, or the
  // existing bond is invalid. Observed in production after ~30s.
  PairingRefused: 'PairingRefusedError',
  // DMK remote-network failures (manager-api HTTP / secure-channel WS).
  WebSocketConnection: 'WebSocketConnectionError',
  HttpFetch: 'FetchError',
  NetworkDA: 'NetworkDAError',
  InvalidFirmwareMetadataResponse: 'InvalidGetFirmwareMetadataResponseError',
  ApplicationsMetadataTask: 'GetApplicationsMetadataTaskError',
  // DMK OS/secure-channel device actions. `SecureChannelError` is the residual
  // bucket left by SecureChannelError.mapInstallDAErrors() after the locked /
  // refused / already-installed / OOM cases have been split out, so it means
  // "the relay itself broke", not "the device answered".
  SecureChannel: 'SecureChannelError',
  RefusedByUserDA: 'RefusedByUserDAError',
  AppAlreadyInstalledDA: 'AppAlreadyInstalledDAError',
  OutOfMemoryDA: 'OutOfMemoryDAError',
  DeviceNotOnboarded: 'DeviceNotOnboardedError',
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
  ERROR_TAG.OpeningConnectionLegacy,
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

// HID-shaped reading of the opening tag: the device is held by another page.
// BLE callers wrap it as a pairing failure before it reaches here.
const DEVICE_BUSY_TAGS: Set<string> = new Set([
  ERROR_TAG.OpeningConnection,
  ERROR_TAG.OpeningConnectionLegacy,
]);

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

/**
 * "Could not open the connection" — every DMK transport's catch-all for a
 * failed connect, so it says nothing about the cause. On HID that is almost
 * always another page holding the device (DeviceBusy); on BLE it is the
 * generic GATT/pairing failure that RNBleTransport raises for anything it
 * cannot attribute to a removed pairing, and the BLE caller must keep
 * classifying it itself rather than trust the tag.
 */
const CONNECTION_OPENING_TAGS: ReadonlySet<string> = new Set<string>([
  ERROR_TAG.OpeningConnection,
  ERROR_TAG.OpeningConnectionLegacy,
]);
export function isConnectionOpeningTag(tag: unknown): boolean {
  return typeof tag === 'string' && CONNECTION_OPENING_TAGS.has(tag);
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

function hasDeviceActionStep(err: unknown, step: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;

  if (e._lastStep === step) return true;

  if (Array.isArray(e._deviceActionSteps) && e._deviceActionSteps.includes(step)) {
    return true;
  }

  if (e.originalError != null && hasDeviceActionStep(e.originalError, step)) return true;
  if (e.error != null && e._tag && hasDeviceActionStep(e.error, step)) return true;
  return false;
}

function hasBlindSigningStep(err: unknown): boolean {
  for (const step of BLIND_SIGNING_STEPS) {
    if (hasDeviceActionStep(err, step)) return true;
  }
  return false;
}

function hasInvalidArgumentCode(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e.code === 'INVALID_ARGUMENT') return true;
  if (typeof e.message === 'string' && e.message.includes('code=INVALID_ARGUMENT')) return true;
  if (e.originalError != null && hasInvalidArgumentCode(e.originalError)) return true;
  if (e.error != null && e._tag && hasInvalidArgumentCode(e.error)) return true;
  return false;
}

/** Does this error, or anything it wraps, carry one of `tags` as its `_tag`? */
function hasErrorTag(err: unknown, tags: ReadonlySet<string>): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (typeof e._tag === 'string' && tags.has(e._tag)) return true;
  if (e.originalError != null && hasErrorTag(e.originalError, tags)) return true;
  if (e.error != null && e._tag && hasErrorTag(e.error, tags)) return true;
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

/**
 * Check for user rejection (denied on device). `RefusedByUserDAError` is what
 * the OS device actions raise when the user declines "Allow secure connection"
 * or "Allow manager" during install — it carries no `message`, so it has to be
 * matched by tag.
 */
const USER_REJECTED_TAGS: ReadonlySet<string> = new Set<string>([
  ERROR_TAG.UserRefusedOnDevice,
  ERROR_TAG.RefusedByUserDA,
]);
export function isUserRejectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (hasErrorTag(err, USER_REJECTED_TAGS)) return true;
  if (typeof e.message === 'string' && /denied|rejected|refused/i.test(e.message)) return true;
  if (hasStatusCode(err, USER_REJECTED_CODES)) return true;
  return false;
}

/** Check for SDK-level user abort (declined install prompt, cancelled UI flow). */
export function isUserAbortedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return e._tag === ERROR_TAG.UserAborted;
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

/** DMK install ran out of space on the device. Identified by the DMK error tag. */
const OUT_OF_MEMORY_TAGS: ReadonlySet<string> = new Set<string>([ERROR_TAG.OutOfMemoryDA]);
export function isOutOfMemoryError(err: unknown): boolean {
  return hasErrorTag(err, OUT_OF_MEMORY_TAGS);
}

/** Install refused because the app is already present on the device. */
const APP_ALREADY_INSTALLED_TAGS: ReadonlySet<string> = new Set<string>([
  ERROR_TAG.AppAlreadyInstalledDA,
]);
export function isAppAlreadyInstalledError(err: unknown): boolean {
  return hasErrorTag(err, APP_ALREADY_INSTALLED_TAGS);
}

/** Device has no seed yet — install and every OS action need an onboarded device. */
const DEVICE_NOT_ONBOARDED_TAGS: ReadonlySet<string> = new Set<string>([
  ERROR_TAG.DeviceNotOnboarded,
]);
export function isDeviceNotOnboardedError(err: unknown): boolean {
  return hasErrorTag(err, DEVICE_NOT_ONBOARDED_TAGS);
}

/**
 * Ledger's manager-api answered with metadata the SDK cannot parse. The request
 * reached the server, so this is not a connectivity failure and must not be
 * classified as one — a caller that treats it as a dropped link would tear down
 * a healthy device session.
 */
const FIRMWARE_METADATA_TAGS: ReadonlySet<string> = new Set<string>([
  ERROR_TAG.InvalidFirmwareMetadataResponse,
  ERROR_TAG.ApplicationsMetadataTask,
]);
export function isFirmwareMetadataError(err: unknown): boolean {
  return hasErrorTag(err, FIRMWARE_METADATA_TAGS);
}

/**
 * The secure channel relaying install APDUs between Ledger's script runner and
 * the device broke. Checked after the device-answered cases because
 * `mapInstallDAErrors()` has already split those out of `SecureChannelError`.
 */
const SECURE_CHANNEL_TAGS: ReadonlySet<string> = new Set<string>([ERROR_TAG.SecureChannel]);
export function isSecureChannelError(err: unknown): boolean {
  return hasErrorTag(err, SECURE_CHANNEL_TAGS);
}

/** Remote network failure reaching Ledger's servers (HTTP or WS). Crawls the error chain. */
const NETWORK_ERROR_TAGS: ReadonlySet<string> = new Set<string>([
  ERROR_TAG.WebSocketConnection,
  ERROR_TAG.HttpFetch,
  ERROR_TAG.NetworkDA,
]);
export function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const tag = e._tag;
  if (typeof tag === 'string' && NETWORK_ERROR_TAGS.has(tag)) return true;
  if (e.originalError != null && isNetworkError(e.originalError)) return true;
  if (e.error != null && isNetworkError(e.error)) return true;
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
 * DMK's placeholder text. `mapInstallDAErrors()` builds RefusedByUser /
 * AppAlreadyInstalled / OutOfMemory / UnknownDA with no argument, so their
 * `originalError.message` is this literal — less informative than the tag.
 */
const DMK_PLACEHOLDER_MESSAGE = 'Unknown error.';

/** Readable text from a wrapped error, or undefined when it says nothing. */
function nestedErrorMessage(nested: unknown): string | undefined {
  if (!nested || typeof nested !== 'object') return undefined;
  const { message } = nested as Record<string, unknown>;
  if (typeof message !== 'string') return undefined;
  const trimmed = message.trim();
  if (!trimmed || trimmed === DMK_PLACEHOLDER_MESSAGE) return undefined;
  return message;
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
  origin?: HwkErrorOrigin;
  appName?: string;
} {
  // Order matters: check more specific errors first

  // Extract the original message for fallback / enrichment. DMK's device-action
  // errors are plain classes with no `message` of their own — the readable text
  // lives on `originalError`, so prefer that over falling back to the tag.
  let originalMessage = 'Unknown Ledger error';
  if (err instanceof Error) {
    originalMessage = err.message;
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    originalMessage = String(
      e.message ?? nestedErrorMessage(e.originalError) ?? e._tag ?? e.type ?? JSON.stringify(err)
    );
  }

  let code: HardwareErrorCode;

  // DeviceLocked: _tag handoff (unlock-device) or APDU 0x5515/0x6982.
  if (isDeviceLockedError(err)) {
    code = HardwareErrorCode.DeviceLocked;
  } else if (isDeviceNotAdvertisingError(err) || isDeviceNotFoundError(err)) {
    code = HardwareErrorCode.DeviceNotFound;
  } else if (isBlePairingFailureError(err)) {
    // Must precede isDeviceBusyError: the BLE wrapper keeps the raw transport
    // error on `originalError`, and the busy check crawls that chain. A GATT
    // failure the BLE layer already classified is a pairing failure, not a
    // device held by another app.
    code = HardwareErrorCode.BlePairingTimeout;
  } else if (isDeviceBusyError(err)) {
    code = HardwareErrorCode.DeviceBusy;
  } else if (isUserAbortedError(err)) {
    // SDK-level abort (e.g. user declined the install prompt). Distinct from
    // on-device UserRejected — surface UserAborted so callers can tell apart
    // "I closed the dialog" from "I pressed reject on the device".
    code = HardwareErrorCode.UserAborted;
  } else if (isUserRejectedError(err)) {
    // User rejection (0x6985) must win over EthAppError mapping — a user-cancelled
    // blind-sign is not a "please enable Blind signing" situation.
    code = HardwareErrorCode.UserRejected;
  } else if (isWrongAppError(err)) {
    code = HardwareErrorCode.WrongApp;
  } else if (isAppNotInstalledError(err)) {
    code = HardwareErrorCode.AppNotInstalled;
  } else if (isAppAlreadyInstalledError(err)) {
    code = HardwareErrorCode.AppAlreadyInstalled;
  } else if (isOutOfMemoryError(err)) {
    code = HardwareErrorCode.DeviceOutOfMemory;
  } else if (isDeviceNotOnboardedError(err)) {
    code = HardwareErrorCode.DeviceNotInitialized;
  } else if (isFirmwareMetadataError(err)) {
    // A parseable-response failure, not a dead link — keep it off NetworkError
    // so transport-level recovery never fires for it.
    code = HardwareErrorCode.LedgerFirmwareMetadataError;
  } else if (isNetworkError(err)) {
    // Must precede isDeviceDisconnectedError — its message-substring match can trip on network errors.
    code = HardwareErrorCode.NetworkError;
  } else if (isSecureChannelError(err)) {
    // Last of the remote-side classes: whatever mapInstallDAErrors() did not
    // attribute to the device is the relay itself failing.
    code = HardwareErrorCode.LedgerSecureChannelError;
  } else if (isDeviceDisconnectedError(err)) {
    code = HardwareErrorCode.DeviceDisconnected;
  } else if (isTimeoutError(err)) {
    code = HardwareErrorCode.OperationTimeout;
  } else {
    const ethMapped = classifyEthAppError(err) ?? classifyBlindSigningDetectionError(err);

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

  // Origin rides on the shared code→origin table — every branch above maps to
  // a code whose origin is unambiguous by definition (a rejection IS the
  // device, a disconnect IS the pipe). The two context-dependent outcomes
  // (OperationTimeout, UnknownError) come back undefined from the table, which
  // is the honest answer here too: at this point the classifier chain has
  // already failed to see anything more specific.
  return {
    code,
    message: enrichErrorMessage(code, originalMessage),
    origin: defaultOriginForCode(code),
    appName,
  };
}
