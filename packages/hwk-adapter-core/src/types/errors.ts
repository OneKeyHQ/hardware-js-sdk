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
  /**
   * The device rejected the requested derivation path (Trezor Failure_DataError
   * "Forbidden key path") — the path is non-standard or its index is outside the
   * range the device's safety checks allow. Distinct from ChainNotSupported
   * (whole chain) and MethodNotSupported (the operation/method itself).
   */
  DevicePathForbidden = 10110,
  /** Busy with our own in-flight request (queue guard / firmware Failure_Busy), not another app — wait and retry, don't close other apps. */
  DeviceBusyInternal = 10111,

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
  /**
   * The device is configured to always collect the passphrase on its own
   * keyboard (Trezor PASSPHRASE_ALWAYS_ON_DEVICE), so the host may not put a
   * passphrase in the message at all — an empty string included. That makes the
   * empty-passphrase ("standard") wallet unreachable: `on_device` entry cannot
   * express it, since nothing stops the user typing something else. Callers
   * asking for the standard wallet on such a device get this instead of a
   * silently mismatched wallet; the user must turn the device setting off.
   * Hidden (passphrase) wallets are unaffected.
   */
  PassphraseAlwaysOnDevice = 10405,

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
