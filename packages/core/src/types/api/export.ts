export type { BTCAddress, BTCGetAddressParams } from './btcGetAddress';
export type { BTCPublicKey, BTCGetPublicKeyParams } from './btcGetPublicKey';
export type { BTCSignMessageParams } from './btcSignMessage';
export type { BTCVerifyMessageParams } from './btcVerifyMessage';

export type { DeviceChangePinParams } from './deviceChangePin';
export type { DeviceFlagsParams } from './deviceFlags';
export type { DeviceRecoveryParams } from './deviceRecovery';
export type { DeviceResetParams } from './deviceReset';
export type { DeviceSettingsParams } from './deviceSettings';

export type { EVMAddress, EVMGetAddressParams } from './evmGetAddress';
export type { EVMPublicKey, EVMGetPublicKeyParams } from './evmGetPublicKey';
export type { EVMSignMessageParams } from './evmSignMessage';
export type { EVMSignMessageEIP712Params } from './evmSignMessageEIP712';
export type {
  EVMTransaction,
  EVMTransactionEIP1559,
  EVMSignedTx,
  EVMSignTransactionParams,
  EVMAccessList,
} from './evmSignTransaction';
export type {
  EthereumSignTypedDataTypes,
  EthereumSignTypedDataTypeProperty,
  EthereumSignTypedDataMessage,
  EVMSignTypedDataParams,
} from './evmSignTypedData';
export type { EVMVerifyMessageParams } from './evmVerifyMessage';

export type { StarcoinAddress, StarcoinGetAddressParams } from './starcoinGetAddress';
export type { StarcoinPublicKey, StarcoinGetPublicKeyParams } from './starcoinGetPublicKey';
export type { StarcoinSignMessageParams } from './starcoinSignMessage';
export type { StarcoinSignTransactionParams } from './starcoinSignTransaction';
export type { StarcoinVerifyMessageParams } from './starcoinVerifyMessage';