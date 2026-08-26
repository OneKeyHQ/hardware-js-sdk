// UR engine (used by the QR event loop and the USB connector alike — both
// channels carry the same UR payloads).
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
  accountKey,
  createDeviceRecord,
  placeholderDeviceInfo,
  qrConnectId,
  toDeviceInfo,
  QR_CONNECT_ID_PREFIX,
} from './adapter/deviceTable';
export type { KeystoneAccountEntry, KeystoneDeviceRecord } from './adapter/deviceTable';
export { btcScriptTypeFromPath, normalizePath, splitAccountPath } from './adapter/pathUtils';
