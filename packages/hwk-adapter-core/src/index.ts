export { HardwareErrorCode, ORPHAN_ELIGIBLE_ERROR_CODES } from './types/errors';

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
  TronSignTxParams,
  TronSignedTx,
  TronSignMsgParams,
  TronSignature,
  ITronMethods,
} from './types/chain-tron';

export type { QrDisplayData, QrResponseData } from './types/qr';

export type { ChainForFingerprint } from './types/fingerprint';
export { CHAIN_FINGERPRINT_PATHS, deriveDeviceFingerprint } from './types/fingerprint';

export type {
  IHardwareWallet,
  SearchDevicesOptions,
  PassphraseResponse,
  ChainCapability,
  DeviceEvent,
  UiRequestEvent,
  SdkEvent,
  HardwareEvent,
  HardwareEventMap,
  DeviceEventListener,
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
  IConnector,
  IHardwareBridge,
} from './types/connector';
export { createBridgedConnector, EConnectorInteraction } from './types/connector';

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
export { batchCall } from './utils/batchCall';
