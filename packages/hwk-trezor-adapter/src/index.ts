export { TrezorAdapter } from './adapter/TrezorAdapter';
// Pure verifier for backend/mock-backend attestation validation. It performs
// no device I/O and never trusts the adapter's client-side `verified` verdict.
export {
  authenticateDeviceFromProof,
  getRequiredDeviceAuthenticityLayers,
} from './deviceAuthenticity';
export type { AuthenticateDeviceResult, AuthenticityProof } from './deviceAuthenticity';
// Opt-in definition-fetch helpers. NOT called by any signing method — callers
// fetch (through their own `baseUrl` proxy if desired) and inject the bytes into
// the sign params (`ethereumDefinitions` / `additionalInfo.encodedToken`).
export {
  fetchEthereumDefinitions,
  buildEthereumDefinitionsForPath,
  buildEthereumDefinitionsForSignTx,
  getSlip44FromPath,
  DEFAULT_ETHEREUM_DEFINITIONS_BASE_URL,
} from './utils/ethereumDefinitions';
export type {
  FetchLike,
  FetchEthereumDefinitionsParams,
  BuildEthereumDefinitionsForPathParams,
  BuildEthereumDefinitionsForSignTxParams,
} from './utils/ethereumDefinitions';
export {
  fetchSolanaTokenDefinition,
  DEFAULT_SOLANA_TOKEN_DEFINITION_BASE_URL,
} from './utils/solanaTokenDefinition';
export type { FetchSolanaTokenDefinitionParams } from './utils/solanaTokenDefinition';
export { onSdkEvent, offSdkEvent } from './utils/sdkEventBus';
export type { SdkEvent, SdkEventListener, SdkLogEvent } from './utils/sdkEventBus';
export {
  TREZOR_BLE_PACKET_SIZE,
  TREZOR_BLE_SUPPORTED_MODELS,
  TREZOR_BLE_UUIDS,
  TREZOR_SAFE_7_MODEL,
} from './constants';
export {
  isTrezorBleServiceUuid,
  isTrezorBleSupportedModel,
  isTrezorBleDescriptor,
  isTrezorSafe7BleDescriptor,
  isTrezorSafe7BleName,
  normalizeTrezorBleUuid,
  resolveTrezorBleConnectId,
} from './utils/bleIdentity';
export type {
  TrezorBleDescriptor,
  TrezorBleTransport,
  TrezorBleTransportFactory,
  TrezorConnectedDevice,
  TrezorConnectorDevice,
} from './types';
