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
 *   10600-10999  RESERVED — future adapter-level categories
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

  // --- 10400s PIN / Passphrase ---
  PinInvalid = 10400,
  PinCancelled = 10401,
  PassphraseRejected = 10402,

  // --- 10500s App lifecycle ---
  /** Chain app NOT INSTALLED on device. User must install via Ledger Live. */
  AppNotInstalled = 10500,
  WrongApp = 10501,
  /** 0x911c Command code not supported — app predates current SDK. */
  AppTooOld = 10502,
  /** Not enough free storage for install/update; user must uninstall apps first. */
  DeviceOutOfMemory = 10503,

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
  HardwareErrorCode.DeviceMismatch,
  HardwareErrorCode.DeviceAppStuck,
  HardwareErrorCode.DeviceOneDeviceOnly,
  HardwareErrorCode.TransportError,
  HardwareErrorCode.DevicePermissionDenied,
  HardwareErrorCode.BlePairingTimeout,
];

// ---------------------------------------------------------------------------
// Standard throwable for HWK adapters
// ---------------------------------------------------------------------------

export interface IHwkErrorPayload {
  code: HardwareErrorCode;
  message: string;
  appName?: string;
  _tag?: string;
  params?: Record<string, unknown>;
}

export type HwkError = Error & {
  code: HardwareErrorCode;
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
  return Object.assign(new Error(payload.message), {
    code: payload.code,
    ...(payload._tag !== undefined && { _tag: payload._tag }),
    ...(payload.appName !== undefined && { appName: payload.appName }),
    ...(payload.params !== undefined && { params: payload.params }),
  });
}
