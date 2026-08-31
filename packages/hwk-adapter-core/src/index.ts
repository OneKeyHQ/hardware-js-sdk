export { HardwareErrorCode, ORPHAN_ELIGIBLE_ERROR_CODES, createHwkError } from './types/errors';
export type { HwkError, IHwkErrorPayload } from './types/errors';

export type { Success, Failure, Response } from './types/response';
export { success, failure } from './types/response';

export type {
  VendorType,
  ConnectionType,
  TransportType,
  DeviceInfo,
  DeviceTarget,
  DeviceCapabilities,
} from './types/device';

export type {
  EvmGetAddressParams,
  EvmAddress,
  EvmSignTxParams,
  EvmSignTxLedgerParams,
  EvmSignTxTrezorParams,
  EvmEthereumDefinitions,
  EvmPaymentRequest,
  EvmPaymentRequestMemo,
  EvmSignedTx,
  EvmSignMsgParams,
  EvmSignTypedDataParams,
  EvmSignTypedDataFull,
  EvmSignTypedDataHash,
  EIP712Domain,
  EvmSignature,
  IEvmMethods,
} from './types/chain-evm';

export type {
  BtcGetAddressParams,
  BtcAddress,
  BtcGetPublicKeyParams,
  BtcPublicKey,
  BtcSignTxParams,
  BtcTxInput,
  BtcTxOutput,
  BtcPaymentRequest,
  BtcPaymentRequestMemo,
  BtcRefTransaction,
  BtcSignedTx,
  BtcSignPsbtParams,
  BtcSignedPsbt,
  BtcSignMsgParams,
  BtcSignature,
  IBtcMethods,
} from './types/chain-btc';

export type {
  SolGetAddressParams,
  SolAddress,
  SolSignTxParams,
  SolSignedTx,
  SolSignMsgParams,
  SolSignature,
  ISolMethods,
} from './types/chain-sol';

export type {
  TronGetAddressParams,
  TronAddress,
  TronResource,
  TronTransferContract,
  TronTriggerSmartContract,
  TronFreezeBalanceV2Contract,
  TronUnfreezeBalanceV2Contract,
  TronVote,
  TronVoteWitnessContract,
  TronWithdrawExpireUnfreezeContract,
  TronContract,
  TronSignTxParams,
  TronSignedTx,
  TronSignMsgParams,
  TronSignature,
  ITronMethods,
} from './types/chain-tron';

export type { PassphraseStateAware } from './types/passphrase';

export type { QrDisplayData, QrResponseData } from './types/qr';

export type { ChainForFingerprint } from './types/fingerprint';
export { CHAIN_FINGERPRINT_PATHS, deriveDeviceFingerprint } from './types/fingerprint';

export type {
  IHardwareWallet,
  IDeviceManagerMethods,
  IWalletStateMethods,
  SearchDevicesOptions,
  PassphraseResponse,
  ChainCapability,
  TrezorBrightnessParams,
  TrezorChangePinParams,
  TrezorDeviceSettingsParams,
  TrezorDisplayRotation,
  TrezorSafetyCheckLevel,
  ICommonCallParams,
  IPassphraseCallParams,
  IHardwareCommonCallParams,
  IHardwareCallParams,
  NullableCallArg,
  AllNetworkAddressParams,
  AllNetworkGetAddressParams,
  AllNetworkAddressResponsePayload,
  AllNetworkAddressResponse,
  DeviceEvent,
  UiRequestEvent,
  SdkEvent,
  HardwareEvent,
  HardwareUiEvent,
  HardwareEventMap,
  DeviceEventListener,
  DeviceAuthenticityParams,
  DeviceAuthenticityResult,
} from './types/wallet';

export { DEVICE_EVENT, DEVICE } from './events/device';
export { UI_EVENT, UI_REQUEST, UI_RESPONSE } from './events/ui-request';
export type {
  DevicePermissionDeniedReason,
  DevicePermissionResponse,
  UiResponseEvent,
} from './events/ui-request';
export { SDK } from './events/sdk';

export type {
  DeviceDescriptor,
  DeviceConnectEvent,
  DeviceDisconnectEvent,
  DeviceChangeEvent,
} from './types/transport';

export { DeviceJobQueue } from './utils/DeviceJobQueue';
export type { JobOptions, ActiveJobInfo } from './utils/DeviceJobQueue';

export type {
  ConnectorDevice,
  ConnectorSession,
  ConnectorEventType,
  ConnectorEventMap,
  ConnectorUiEvent,
  ConnectorCallResult,
  ConnectorSerializedError,
  ConnectorErrorParams,
  ConnectorConfig,
  IConnector,
  IHardwareBridge,
} from './types/connector';
export {
  createBridgedConnector,
  createCombinedConnector,
  EConnectorInteraction,
  serializeConnectorError,
  rehydrateConnectorError,
} from './types/connector';

export { TypedEventEmitter } from './utils/TypedEventEmitter';
export {
  UiRequestRegistry,
  UI_REQUEST_DEFAULT_TIMEOUT_MS,
  UI_REQUEST_PREEMPTED_TAG,
  UI_REQUEST_CANCELLED_TAG,
  UI_REQUEST_TIMEOUT_TAG,
} from './utils/UiRequestRegistry';
export { compareSemver } from './utils/semver';
export { ensure0x, stripHex, padHex64, hexToBytes, bytesToHex } from './utils/hex';
export { enrichErrorMessage } from './utils/errorMessages';
export {
  detectHardwareVendorFromDescriptor,
  isKnownNonTargetHardwareVendor,
} from './utils/deviceIdentity';
export type { DetectableHardwareVendor, HardwareDeviceIdentityInput } from './utils/deviceIdentity';
export { batchCall } from './utils/batchCall';
export {
  ALL_NETWORK_METHOD_NAMES,
  HARDWARE_METHOD_CATALOG,
  getAllNetworkMethodChain,
  getHardwareMethodMetadata,
  isAllNetworkMethodName,
} from './utils/methodCatalog';
export type {
  AllNetworkMethodName,
  HardwareMethodMetadata,
  HardwareMethodName,
} from './utils/methodCatalog';
export { buildUnsupportedMethodResponse, runAllNetworkGetAddress } from './utils/allNetwork';
export type {
  AllNetworkAttachIdentityContext,
  AllNetworkCallItemContext,
  AllNetworkResponseContext,
  RunAllNetworkGetAddressOptions,
} from './utils/allNetwork';
export { DEVICE_CONNECT_RETRY_DELAY_MS } from './constants';
