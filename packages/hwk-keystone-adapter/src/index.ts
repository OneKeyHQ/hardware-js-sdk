// UR engine, shared by QR and USB since both carry the same UR payloads.
export { KeystoneUrEngine } from './urEngine/KeystoneUrEngine';
export type {
  BtcScriptType,
  KeystoneBtcSignatureResult,
  KeystoneBtcSignRequestAccount,
  KeystoneDerivationCurve,
  KeystoneEthSignatureResult,
  KeystoneEthSignRequestInput,
  KeystoneKeyDerivationRequestInput,
  KeystoneKeySchema,
  KeystoneParsedAccount,
  KeystoneParsedMultiAccounts,
  KeystoneSolSignatureResult,
  KeystoneSolSignRequestInput,
  KeystoneTronSignatureResult,
  KeystoneTronSignRequestInput,
  KeystoneUr,
} from './urEngine/types';

// Adapter
export { KeystoneAdapter } from './adapter/KeystoneAdapter';
export type { ImportFromQrOptions } from './adapter/KeystoneAdapter';
export {
  KEYSTONE_COLD_START_PATH,
  KEYSTONE_WALLET_CONNECT_ID_PREFIX,
  accountKey,
  createDeviceRecord,
  placeholderDeviceInfo,
  toDeviceInfo,
  walletConnectId,
} from './adapter/deviceTable';
export type { KeystoneAccountEntry, KeystoneDeviceRecord } from './adapter/deviceTable';
export { btcScriptTypeFromPath, normalizePath, splitAccountPath } from './adapter/pathUtils';
