export enum HardwareErrorCode {
  UnknownError = 0,
  DeviceNotFound = 1,
  DeviceDisconnected = 2,
  UserRejected = 3,
  DeviceBusy = 4,
  FirmwareUpdateRequired = 5,
  AppNotOpen = 6,
  InvalidParams = 7,
  TransportError = 8,
  OperationTimeout = 9,
  MethodNotSupported = 10,

  // PIN / Passphrase
  PinInvalid = 5520,
  PinCancelled = 5521,
  PassphraseRejected = 5522,

  // Device state
  DeviceLocked = 5530,
  DeviceNotInitialized = 5531,
  DeviceInBootloader = 5532,
  FirmwareTooOld = 5533,

  // Ledger specific
  WrongApp = 5540,

  // Device identity
  DeviceMismatch = 5560,

  // Transport
  BridgeNotFound = 5550,
  TransportNotAvailable = 5551,

  // --- EVM (Ledger Ethereum App) APDU-specific errors ---
  /** 0x6a80 Invalid data — observed on blindSignTransactionFallback when the
   *  user has not enabled Blind signing on the device. */
  EvmBlindSigningRequired = 7001,
  /** 0x6984 Plugin not installed */
  EvmClearSignPluginMissing = 7002,
  /** 0x6a84 Insufficient memory (typical on Nano S with large calldata) */
  EvmDataTooLarge = 7003,
  /** 0x6501 TransactionType not supported (app too old for EIP-1559 / blob / 7702) */
  EvmTxTypeNotSupported = 7004,
  /** 0x911c Command code not supported — app predates current SDK */
  AppTooOld = 7005,

  // --- Solana ---
  /** 0x6808 Blind signing disabled for this instruction. */
  SolanaBlindSigningRequired = 7101,

  // --- Tron ---
  /** 0x6a8d Custom Contracts setting disabled (blocks TRC-20 etc.). */
  TronCustomContractRequired = 7201,
  /** 0x6a8b Transactions Data setting disabled. */
  TronDataSigningRequired = 7202,
  /** 0x6a8c Sign by Hash setting disabled (hash-signing fallback). */
  TronSignByHashRequired = 7203,

  // --- BTC ---
  /** 0xb008 Wallet policy HMAC mismatch or not registered. */
  BtcWalletPolicyHmacMismatch = 7301,
  /** 0xb007 Aborted due to unexpected state (malformed PSBT / missing UTXO). */
  BtcUnexpectedState = 7302,
}
