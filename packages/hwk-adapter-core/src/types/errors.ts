/**
 * HWK HardwareErrorCode — independent namespace from the legacy
 * `@onekeyfe/shared` HardwareErrorCode (which occupies 0-902).
 *
 * All HWK codes are 5-digit (>= 10000) so the two tables never collide
 * even if either side grows. Each sub-category gets a 100-slot block.
 *
 *   10000-10099  Generic / cross-cutting primitives
 *   10100-10199  Device state
 *   10200-10299  Firmware
 *   10300-10399  Transport + OS-level permission
 *   10400-10499  PIN / Passphrase
 *   10500-10599  App lifecycle (wrong app, not open, too old)
 *   10600-10699  Payload / framing limits (adapter-level)
 *   10700-10999  RESERVED — future adapter-level categories
 *
 *   11000-11099  EVM APDU (reactive mapping)
 *   11100-11199  Solana APDU
 *   11200-11299  Tron APDU
 *   11300-11399  BTC APDU
 *   11400-11999  RESERVED — future chain APDU blocks (100 per chain)
 *
 *   12000-99999  RESERVED — future major categories
 */
export enum HardwareErrorCode {
  // --- 10000s Generic ---
  UnknownError = 10000,
  UserRejected = 10001,
  InvalidParams = 10002,
  OperationTimeout = 10003,
  MethodNotSupported = 10004,
  /** User dismissed in-app cancel UI. Distinct from UserRejected (on-device). */
  UserAborted = 10005,

  // --- 10100s Device state ---
  DeviceNotFound = 10100,
  DeviceDisconnected = 10101,
  DeviceBusy = 10102,
  DeviceLocked = 10103,
  DeviceNotInitialized = 10104,
  DeviceInBootloader = 10105,
  DeviceMismatch = 10106,
  /** Chain app wedged (e.g. Ledger BTC 0x6901). User must exit app on device. */
  DeviceAppStuck = 10107,
  /** Vendor (Ledger / Trezor) doesn't support the chain at all. */
  ChainNotSupported = 10108,
  /** Current operation supports only one connected device. */
  DeviceOneDeviceOnly = 10109,
  /**
   * The device rejected the requested derivation path (Trezor Failure_DataError
   * "Forbidden key path") — the path is non-standard or its index is outside the
   * range the device's safety checks allow. Distinct from ChainNotSupported
   * (whole chain) and MethodNotSupported (the operation/method itself).
   */
  DevicePathForbidden = 10110,
  /** Busy with our own in-flight request (queue guard / firmware Failure_Busy), not another app — wait and retry, don't close other apps. */
  DeviceBusyInternal = 10111,
  /** The supplied runtime-only interaction id is unknown to this adapter instance. */
  InteractionNotFound = 10112,
  /** The supplied interaction ended and can never be resumed. */
  InteractionEnded = 10113,

  // --- 10200s Firmware ---
  FirmwareTooOld = 10200,
  FirmwareUpdateRequired = 10201,

  // --- 10300s Transport + permission ---
  TransportError = 10300,
  BridgeNotFound = 10301,
  TransportNotAvailable = 10302,
  /**
   * OS-level permission (Bluetooth / USB / etc.) — denied, blocked,
   * unavailable, or dismissed. Consumers surface a single "please grant
   * permission" toast and let the user retry manually.
   */
  DevicePermissionDenied = 10303,
  /**
   * BLE SMP pairing did not complete within the GATT bonding window.
   * GATT connected but the device didn't acknowledge SMP — typically
   * because the user didn't confirm the passkey on the device, or the
   * device went out of range mid-pairing. Distinct from OperationTimeout
   * (generic) and from DeviceLocked (Secure Element actually locked).
   */
  BlePairingTimeout = 10304,
  /** Remote network failure reaching a vendor's servers (HTTP/WS). Distinct from TransportError (local USB/BLE link). */
  NetworkError = 10305,
  /**
   * Host-managed pairing handshake failed (Trezor THP). The device rejected the
   * pairing exchange — e.g. CodeEntry: the user mistyped the code shown on the
   * device, so the CPace tag didn't match ("Unexpected Code Entry Tag").
   * Recoverable: the user re-pairs and re-enters the code. Distinct from
   * BlePairingTimeout (BLE SMP bonding window) and UserRejected (on-device
   * reject button).
   */
  ThpPairingFailed = 10306,
  /**
   * The OS-level BLE bond is stale/invalid, so the device rejected link
   * encryption: Android GATT_INSUF_AUTHENTICATION (status 5) or iOS "Peer
   * removed pairing information". Happens after the device is wiped/re-flashed
   * or unpaired elsewhere while the host still holds an old bond. The SDK cannot
   * remove an OS bond — the user must forget the device in system Bluetooth
   * settings and re-pair. Distinct from BlePairingTimeout (SMP window) and
   * ThpPairingFailed (THP code mismatch).
   */
  BleBondInvalid = 10307,
  /**
   * A stored THP pairing credential was rejected by the device during the
   * handshake (device returned completion `state=0`), so the autoconnect session
   * could not be established. The SDK discards the stale credential; recovery is
   * a fresh pairing. Distinct from ThpPairingFailed (user mistyped the code
   * during an *active* pairing) and BleBondInvalid (OS-level BLE bond).
   */
  ThpPairingRequired = 10308,
  /**
   * Generic BLE connect failure where the OS dropped the specific reason. On
   * macOS the noble native binding hardcodes "connection failed" (and a connect
   * timeout) and discards the CoreBluetooth NSError, so the SDK cannot tell a
   * stale bond from an out-of-range / unresponsive device. Surfaced as a
   * generic "couldn't connect — check the device, re-pair if paired before".
   * Distinct from BleBondInvalid (a *known* stale-bond signal, iOS/Android only)
   * and BlePairingTimeout (the SMP bonding window).
   */
  BleConnectFailed = 10309,
  /**
   * The user cancelled BLE pairing from the app while the connect was still
   * waiting on the OS pairing window. Not a failure to report — the flow ends
   * because they asked it to. Distinct from UserAborted (generic in-app cancel)
   * so the pairing UI can close quietly instead of surfacing a connect error,
   * and from BlePairingTimeout (the SMP window elapsed on its own).
   */
  BlePairingCancelled = 10310,

  // --- 10400s PIN / Passphrase ---
  PinInvalid = 10400,
  PinCancelled = 10401,
  PassphraseRejected = 10402,
  /**
   * The passphrase entered produced a different wallet (`passphraseState`) than
   * the one the caller asked to operate on. Trezor-only: the host pins a wallet
   * by its derived state and the SDK refuses to sign with a mismatched
   * passphrase session. Surfaced by TrezorAdapter.getPassphraseState.
   */
  PassphraseStateMismatch = 10403,
  /**
   * The two new-PIN entries did not match during set/change PIN. Only host-input
   * models (Trezor Model One matrix) surface this; on-device-input models show
   * the mismatch on the device and never return it.
   */
  PinMismatch = 10404,
  /** Standard wallet is unavailable while Trezor enforces on-device passphrase entry. */
  PassphraseAlwaysOnDevice = 10405,

  // --- 10500s App lifecycle ---
  /** Chain app NOT INSTALLED on device. User must install via Ledger Live. */
  AppNotInstalled = 10500,
  WrongApp = 10501,
  /** 0x911c Command code not supported — app predates current SDK. */
  AppTooOld = 10502,
  /** Not enough free storage for install/update; user must uninstall apps first. */
  DeviceOutOfMemory = 10503,

  // --- 10600s Payload / framing limits ---
  /**
   * The call payload exceeds a transport's fixed framing capacity (e.g.
   * Keystone USB's ~12.5KB per-request cap — 200 frames of 64 bytes). Distinct
   * from a generic TransportError: the request never reached the device, and
   * retrying with the same payload over the same transport will fail the same
   * way. Callers should route the call over a different channel (e.g. Keystone
   * QR) or reduce the payload (e.g. a smaller PSBT) instead of retrying as-is.
   */
  PayloadTooLarge = 10600,

  // --- 11000s EVM (Ledger Ethereum App) APDU-specific ---
  /** 0x6a80 Invalid data — observed on blindSignTransactionFallback when the
   *  user has not enabled Blind signing on the device. */
  EvmBlindSigningRequired = 11000,
  /** 0x6984 Plugin not installed */
  EvmClearSignPluginMissing = 11001,
  /** 0x6a84 Insufficient memory (typical on Nano S with large calldata) */
  EvmDataTooLarge = 11002,
  /** 0x6501 TransactionType not supported (app too old for EIP-1559 / blob / 7702) */
  EvmTxTypeNotSupported = 11003,

  // --- 11100s Solana ---
  /** 0x6808 Blind signing disabled for this instruction. */
  SolanaBlindSigningRequired = 11100,

  // --- 11200s Tron ---
  /** 0x6a8d Custom Contracts setting disabled (blocks TRC-20 etc.). */
  TronCustomContractRequired = 11200,
  /** 0x6a8b Transactions Data setting disabled. */
  TronDataSigningRequired = 11201,
  /** 0x6a8c Sign by Hash setting disabled (hash-signing fallback). */
  TronSignByHashRequired = 11202,

  // --- 11300s BTC ---
  /** 0xb008 Wallet policy HMAC mismatch or not registered. */
  BtcWalletPolicyHmacMismatch = 11300,
  /** 0xb007 Aborted due to unexpected state (malformed PSBT / missing UTXO). */
  BtcUnexpectedState = 11301,
}

/**
 * Device-level failures the SDK cannot self-recover from — affect the entire
 * batch (vs per-chain failures like AppNotInstalled / WrongApp which soft-
 * skip in onboarding). Combined with `accounts.length === 0`, signals
 * genuine orphan. Also reused as the batch-abort whitelist for HWK.
 * Single source of truth.
 *
 * UserRejected (device-side reject) is included: pressing reject is an
 * explicit "I don't consent" — continuing the batch to ask again on the
 * next chain is harassment, not helpful.
 */
export const ORPHAN_ELIGIBLE_ERROR_CODES: number[] = [
  HardwareErrorCode.UserAborted,
  HardwareErrorCode.UserRejected,
  HardwareErrorCode.DeviceNotFound,
  HardwareErrorCode.DeviceDisconnected,
  HardwareErrorCode.InteractionNotFound,
  HardwareErrorCode.InteractionEnded,
  HardwareErrorCode.DeviceMismatch,
  HardwareErrorCode.DeviceAppStuck,
  HardwareErrorCode.DeviceOneDeviceOnly,
  HardwareErrorCode.TransportError,
  HardwareErrorCode.DevicePermissionDenied,
  HardwareErrorCode.BlePairingTimeout,
  HardwareErrorCode.ThpPairingFailed,
  HardwareErrorCode.ThpPairingRequired,
  HardwareErrorCode.BleBondInvalid,
  HardwareErrorCode.BleConnectFailed,
  HardwareErrorCode.BlePairingCancelled,
  HardwareErrorCode.PassphraseAlwaysOnDevice,
];

// ---------------------------------------------------------------------------
// Standard throwable for HWK adapters
// ---------------------------------------------------------------------------

/**
 * Where a failure came from. The distinction the numeric code ranges cannot
 * make reliably (UserRejected=10001 sits in the general range but is the
 * device speaking; DevicePermissionDenied=10303 sits in the transport range
 * but is the browser speaking), and the one recovery logic actually needs:
 *
 * - `device`    the firmware ANSWERED: rejection, locked screen, wrong
 *               wallet, bad PIN. It is a result, not a malfunction — surface
 *               it to the user verbatim; never auto-reconnect, never switch
 *               channels, never drop a healthy session over it.
 * - `transport` the pipe failed: cable pulled, bus reset, bridge gone.
 *               Reconnecting or falling back to another channel is fair game.
 * - `host`      the host environment refused: browser permission, picker
 *               dismissed, bad parameters. Fix the environment, not the link.
 *
 * Optional on purpose: a mapper that cannot tell MUST leave it unset rather
 * than guess — consumers fall back to their existing code-based tables, so an
 * unset origin degrades to today's behavior instead of mislabeling.
 */
export type HwkErrorOrigin = 'device' | 'transport' | 'host';

/**
 * Smallest runtime resource a consumer must replace before retrying a failed
 * operation. This is connection-lifecycle metadata, not UI navigation and not
 * permission to replay a signing command automatically.
 *
 * - `operation`: the interaction and selected target are still eligible for an
 *   explicit retry, usually after the user fixes device state.
 * - `interaction`: the interaction is no longer usable; the selected target may
 *   be used to establish a new one when its identity is persistent.
 * - `search-target`: the selected discovery result is stale or untrusted;
 *   rediscover on the same transport and let the user select again.
 * - `transport`: the selected transport is unavailable or unsuitable; repair
 *   it or choose another transport.
 * - `not-recoverable`: retrying the same operation/context cannot succeed.
 * - `unknown`: the SDK cannot make a safe recovery claim.
 */
export type HwkRecoveryScope =
  | 'operation'
  | 'interaction'
  | 'search-target'
  | 'transport'
  | 'not-recoverable'
  | 'unknown';

export interface HwkRecoveryHint {
  scope: HwkRecoveryScope;
}

const RECOVERY_SCOPES = new Set<HwkRecoveryScope>([
  'operation',
  'interaction',
  'search-target',
  'transport',
  'not-recoverable',
  'unknown',
]);

export function isHwkRecoveryHint(value: unknown): value is HwkRecoveryHint {
  if (!value || typeof value !== 'object') return false;
  const { scope } = value as { scope?: unknown };
  return typeof scope === 'string' && RECOVERY_SCOPES.has(scope as HwkRecoveryScope);
}

const RECOVERY_OPERATION: HwkRecoveryHint = Object.freeze({ scope: 'operation' });
const RECOVERY_INTERACTION: HwkRecoveryHint = Object.freeze({ scope: 'interaction' });
const RECOVERY_SEARCH_TARGET: HwkRecoveryHint = Object.freeze({ scope: 'search-target' });
const RECOVERY_TRANSPORT: HwkRecoveryHint = Object.freeze({ scope: 'transport' });
const RECOVERY_NOT_RECOVERABLE: HwkRecoveryHint = Object.freeze({
  scope: 'not-recoverable',
});
const RECOVERY_UNKNOWN: HwkRecoveryHint = Object.freeze({ scope: 'unknown' });

/**
 * Vendor-neutral fallback used when an adapter has no more precise runtime
 * knowledge. Adapters may stamp a narrower hint when transport/session state
 * makes the correct scope unambiguous.
 */
export function defaultRecoveryForCode(code: HardwareErrorCode): HwkRecoveryHint {
  switch (code) {
    case HardwareErrorCode.UserRejected:
    case HardwareErrorCode.UserAborted:
    case HardwareErrorCode.DeviceBusy:
    case HardwareErrorCode.DeviceLocked:
    case HardwareErrorCode.DeviceNotInitialized:
    case HardwareErrorCode.DeviceInBootloader:
    case HardwareErrorCode.DeviceAppStuck:
    case HardwareErrorCode.DeviceBusyInternal:
    case HardwareErrorCode.NetworkError:
    case HardwareErrorCode.PinInvalid:
    case HardwareErrorCode.PinCancelled:
    case HardwareErrorCode.PassphraseRejected:
    case HardwareErrorCode.PassphraseStateMismatch:
    case HardwareErrorCode.PinMismatch:
    case HardwareErrorCode.FirmwareTooOld:
    case HardwareErrorCode.FirmwareUpdateRequired:
    case HardwareErrorCode.AppNotInstalled:
    case HardwareErrorCode.WrongApp:
    case HardwareErrorCode.AppTooOld:
    case HardwareErrorCode.DeviceOutOfMemory:
    case HardwareErrorCode.EvmBlindSigningRequired:
    case HardwareErrorCode.EvmClearSignPluginMissing:
    case HardwareErrorCode.EvmDataTooLarge:
    case HardwareErrorCode.EvmTxTypeNotSupported:
    case HardwareErrorCode.SolanaBlindSigningRequired:
    case HardwareErrorCode.TronCustomContractRequired:
    case HardwareErrorCode.TronDataSigningRequired:
    case HardwareErrorCode.TronSignByHashRequired:
    case HardwareErrorCode.BtcWalletPolicyHmacMismatch:
    case HardwareErrorCode.BtcUnexpectedState:
      return RECOVERY_OPERATION;
    case HardwareErrorCode.DeviceNotFound:
    case HardwareErrorCode.DeviceDisconnected:
    case HardwareErrorCode.InteractionNotFound:
    case HardwareErrorCode.InteractionEnded:
    case HardwareErrorCode.TransportError:
    case HardwareErrorCode.BlePairingTimeout:
    case HardwareErrorCode.ThpPairingFailed:
    case HardwareErrorCode.ThpPairingRequired:
    case HardwareErrorCode.BleConnectFailed:
    case HardwareErrorCode.BlePairingCancelled:
      return RECOVERY_INTERACTION;
    case HardwareErrorCode.DeviceMismatch:
    case HardwareErrorCode.DeviceOneDeviceOnly:
    case HardwareErrorCode.BleBondInvalid:
      return RECOVERY_SEARCH_TARGET;
    case HardwareErrorCode.BridgeNotFound:
    case HardwareErrorCode.TransportNotAvailable:
    case HardwareErrorCode.DevicePermissionDenied:
    case HardwareErrorCode.PayloadTooLarge:
      return RECOVERY_TRANSPORT;
    case HardwareErrorCode.InvalidParams:
    case HardwareErrorCode.MethodNotSupported:
    case HardwareErrorCode.ChainNotSupported:
    case HardwareErrorCode.DevicePathForbidden:
      return RECOVERY_NOT_RECOVERABLE;
    case HardwareErrorCode.UnknownError:
    case HardwareErrorCode.OperationTimeout:
    default:
      return RECOVERY_UNKNOWN;
  }
}

/**
 * The authoritative code→origin table. Most codes imply their origin by
 * definition (UserRejected IS the device speaking; BridgeNotFound IS the
 * pipe). Vendors use this as the default and override only where their
 * mapping context knows better. Codes whose origin genuinely depends on
 * context (UnknownError, OperationTimeout — the device may be waiting for a
 * human, or the pipe may be dead — and DeviceBusy) return undefined: an
 * honest "can't tell" beats a plausible mislabel, because consumers fall
 * back to their existing behavior instead of taking the wrong recovery.
 */
export function defaultOriginForCode(code: HardwareErrorCode): HwkErrorOrigin | undefined {
  // Chain APDU blocks (11000+) are, without exception, the chain app on the
  // device answering a request it understood and refused/qualified.
  if (code >= 11_000) return 'device';
  switch (code) {
    case HardwareErrorCode.UserRejected:
    case HardwareErrorCode.DeviceLocked:
    case HardwareErrorCode.DeviceNotInitialized:
    case HardwareErrorCode.DeviceInBootloader:
    case HardwareErrorCode.DeviceMismatch:
    case HardwareErrorCode.DeviceAppStuck:
    case HardwareErrorCode.DevicePathForbidden:
    case HardwareErrorCode.DeviceBusyInternal:
    case HardwareErrorCode.ChainNotSupported:
    case HardwareErrorCode.FirmwareTooOld:
    case HardwareErrorCode.FirmwareUpdateRequired:
    case HardwareErrorCode.PinInvalid:
    case HardwareErrorCode.PinMismatch:
    case HardwareErrorCode.PassphraseRejected:
    case HardwareErrorCode.PassphraseStateMismatch:
    case HardwareErrorCode.ThpPairingFailed:
    case HardwareErrorCode.ThpPairingRequired:
    case HardwareErrorCode.WrongApp:
    case HardwareErrorCode.AppNotInstalled:
    case HardwareErrorCode.AppTooOld:
    case HardwareErrorCode.DeviceOutOfMemory:
      return 'device';
    case HardwareErrorCode.DeviceNotFound:
    case HardwareErrorCode.DeviceDisconnected:
    case HardwareErrorCode.TransportError:
    case HardwareErrorCode.BridgeNotFound:
    case HardwareErrorCode.TransportNotAvailable:
    case HardwareErrorCode.BlePairingTimeout:
    case HardwareErrorCode.NetworkError:
    case HardwareErrorCode.BleBondInvalid:
    case HardwareErrorCode.BleConnectFailed:
      return 'transport';
    case HardwareErrorCode.DevicePermissionDenied:
    case HardwareErrorCode.UserAborted:
    case HardwareErrorCode.InvalidParams:
    case HardwareErrorCode.MethodNotSupported:
    case HardwareErrorCode.PinCancelled:
    case HardwareErrorCode.BlePairingCancelled:
    case HardwareErrorCode.PayloadTooLarge:
    case HardwareErrorCode.DeviceOneDeviceOnly:
      return 'host';
    default:
      return undefined;
  }
}

export interface IHwkErrorPayload {
  code: HardwareErrorCode;
  message: string;
  origin?: HwkErrorOrigin;
  recovery?: HwkRecoveryHint;
  appName?: string;
  _tag?: string;
  params?: Record<string, unknown>;
}

export interface IOperationMayHaveCompletedParams extends Record<string, unknown> {
  operationMayHaveCompleted: true;
  method: string;
}

/**
 * Marks an unsafe hardware request whose response was lost after dispatch.
 * Callers must not interpret the resulting transport error as proof that the
 * device rejected or did not execute the operation.
 */
export function operationMayHaveCompletedParams(
  method: string,
  params?: Record<string, unknown>
): IOperationMayHaveCompletedParams {
  return {
    ...params,
    operationMayHaveCompleted: true,
    method,
  };
}

export type HwkError = Error & {
  code: HardwareErrorCode;
  /** See {@link HwkErrorOrigin}. Survives serializeConnectorError/rehydrate
   *  automatically (own fields outside the top-level whitelist travel via
   *  `params` and are lifted back). */
  origin?: HwkErrorOrigin;
  recovery?: HwkRecoveryHint;
  appName?: string;
  _tag?: string;
  params?: Record<string, unknown>;
};

/**
 * Canonical throwable for HWK adapters. Plain Error + canonical extra fields,
 * shape-compatible with `rehydrateConnectorError` so locally-thrown and
 * cross-boundary errors are indistinguishable to downstream classifiers
 * (`err.code` / `err._tag` / `err.appName`). Do NOT mutate caught errors
 * with `Object.assign` — construct a fresh one via this factory.
 */
export function createHwkError(payload: IHwkErrorPayload): HwkError {
  const recovery = payload.recovery ?? defaultRecoveryForCode(payload.code);
  return Object.assign(new Error(payload.message), {
    code: payload.code,
    ...(payload.origin !== undefined && { origin: payload.origin }),
    recovery,
    ...(payload._tag !== undefined && { _tag: payload._tag }),
    ...(payload.appName !== undefined && { appName: payload.appName }),
    ...(payload.params !== undefined && { params: payload.params }),
  });
}
