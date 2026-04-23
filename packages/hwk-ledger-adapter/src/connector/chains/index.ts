export type { ConnectorContext } from './types';

export { evmGetAddress, evmSignTransaction, evmSignMessage, evmSignTypedData } from './evm';
export type {
  EvmGetAddressCallParams,
  EvmSignTransactionCallParams,
  EvmSignMessageCallParams,
  EvmSignTypedDataCallParams,
} from './evm';

export {
  btcGetAddress,
  btcGetPublicKey,
  btcSignTransaction,
  btcSignPsbt,
  btcSignMessage,
  btcGetMasterFingerprint,
} from './btc';
export type {
  BtcGetAddressCallParams,
  BtcGetPublicKeyCallParams,
  BtcSignTransactionCallParams,
  BtcSignPsbtCallParams,
  BtcSignMessageCallParams,
} from './btc';

export { solGetAddress, solSignTransaction, solSignMessage } from './sol';
export type {
  SolGetAddressCallParams,
  SolSignTransactionCallParams,
  SolSignMessageCallParams,
} from './sol';

export { tronGetAddress, tronSignTransaction, tronSignMessage } from './tron';
export type {
  TronGetAddressCallParams,
  TronSignTransactionCallParams,
  TronSignMessageCallParams,
} from './tron';
