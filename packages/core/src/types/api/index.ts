import { off, on, removeAllListeners } from './event';
import { uiResponse } from './uiResponse';
import { init, updateSettings } from './init';

import { testInitializeDeviceDuration } from './testInitializeDeviceDuration';

import { getLogs } from './getLogs';
import { checkTransportRelease } from './checkTransportRelease';
import { checkBridgeStatus } from './checkBridgeStatus';
import { checkBridgeRelease } from './checkBridgeRelease';
import { checkBootloaderRelease } from './checkBootloaderRelease';
import { checkAllFirmwareRelease } from './checkAllFirmwareRelease';

import { searchDevices } from './searchDevices';
import { getFeatures } from './getFeatures';
import { getOnekeyFeatures } from './getOnekeyFeatures';
import { getPassphraseState } from './getPassphraseState';
import { checkFirmwareRelease } from './checkFirmwareRelease';
import { checkBLEFirmwareRelease } from './checkBLEFirmwareRelease';
import { firmwareUpdate, firmwareUpdateV2 } from './firmwareUpdate';
import { requestWebUsbDevice } from './requestWebUsbDevice';

import { deviceReset } from './deviceReset';
import { deviceRecovery } from './deviceRecovery';
import { deviceVerify } from './deviceVerify';
import { deviceWipe } from './deviceWipe';
import { deviceRebootToBootloader } from './deviceRebootToBootloader';
import { deviceRebootToBoardloader } from './deviceRebootToBoardloader';
import { deviceBackup } from './deviceBackup';
import { deviceChangePin } from './deviceChangePin';
import { deviceSettings } from './deviceSettings';
import { deviceFlags } from './deviceFlags';
import { deviceUpdateReboot } from './deviceUpdateReboot';
import { deviceUploadResource } from './deviceUploadResource';
import { deviceSupportFeatures } from './deviceSupportFeatures';
import { deviceFullyUploadResource } from './deviceFullyUploadResource';
import { deviceUpdateBootloader } from './deviceUpdateBootloader';
import { deviceLock } from './deviceLock';
import { deviceCancel } from './deviceCancel';

import { getNextU2FCounter } from './getNextU2FCounter';
import { setU2FCounter } from './setU2FCounter';

import { cipherKeyValue } from './cipherKeyValue';

import { allNetworkGetAddress } from './allNetworkGetAddress';

import { evmGetAddress } from './evmGetAddress';
import { evmGetPublicKey } from './evmGetPublicKey';
import { evmSignMessage } from './evmSignMessage';
import { evmSignMessageEIP712 } from './evmSignMessageEIP712';
import { evmSignTransaction } from './evmSignTransaction';
import { evmSignTypedData } from './evmSignTypedData';
import { evmVerifyMessage } from './evmVerifyMessage';

import { evmGetAddressTrezor } from './evmGetAddressTrezor';
import { evmGetPublicKeyTrezor } from './evmGetPublicKeyTrezor';
import { evmSignMessageTrezor } from './evmSignMessageTrezor';
import { evmSignTransactionTrezor } from './evmSignTransactionTrezor';
import { evmSignTypedDataTrezor } from './evmSignTypedDataTrezor';
import { evmVerifyMessageTrezor } from './evmVerifyMessageTrezor';

import { btcGetAddress } from './btcGetAddress';
import { btcGetPublicKey } from './btcGetPublicKey';
import { btcSignMessage } from './btcSignMessage';
import { btcSignPsbt } from './btcSignPsbt';
import { btcSignTransaction } from './btcSignTransaction';
import { btcVerifyMessage } from './btcVerifyMessage';

import { starcoinGetAddress } from './starcoinGetAddress';
import { starcoinGetPublicKey } from './starcoinGetPublicKey';
import { starcoinSignMessage } from './starcoinSignMessage';
import { starcoinSignTransaction } from './starcoinSignTransaction';
import { starcoinVerifyMessage } from './starcoinVerifyMessage';

import { nemGetAddress } from './nemGetAddress';
import { nemSignTransaction } from './nemSignTransaction';

import { solGetAddress } from './solGetAddress';
import { solSignTransaction } from './solSignTransaction';

import { stellarGetAddress } from './stellarGetAddress';
import { stellarSignTransaction } from './stellarSignTransaction';

import { tronGetAddress } from './tronGetAddress';
import { tronSignTransaction } from './tronSignTransaction';
import { tronSignMessage } from './tronSignMessage';

import { confluxGetAddress } from './confluxGetAddress';
import { confluxSignMessage } from './confluxSignMessage';
import { confluxSignMessageCIP23 } from './confluxSignMessageCIP23';
import { confluxSignTransaction } from './confluxSignTransaction';

import { nearGetAddress } from './nearGetAddress';
import { nearSignTransaction } from './nearSignTransaction';

import { aptosGetAddress } from './aptosGetAddress';
import { aptosGetPublicKey } from './aptosGetPublicKey';
import { aptosSignMessage } from './aptosSignMessage';
import { aptosSignTransaction } from './aptosSignTransaction';

import { algoGetAddress } from './algoGetAddress';
import { algoSignTransaction } from './algoSignTransaction';

import { cosmosGetAddress } from './cosmosGetAddress';
import { cosmosGetPublicKey } from './cosmosGetPublicKey';
import { cosmosSignTransaction } from './cosmosSignTransaction';

import { xrpGetAddress } from './xrpGetAddress';
import { xrpSignTransaction } from './xrpSignTransaction';

import { suiGetAddress } from './suiGetAddress';
import { suiGetPublicKey } from './suiGetPublicKey';
import { suiSignMessage } from './suiSignMessage';
import { suiSignTransaction } from './suiSignTransaction';

import { cardanoGetAddress } from './cardanoGetAddress';
import { cardanoGetPublicKey } from './cardanoGetPublicKey';
import { cardanoSignTransaction } from './cardanoSignTransaction';
import { cardanoSignMessage } from './cardanoSignMessage';

import { filecoinGetAddress } from './filecoinGetAddress';
import { filecoinSignTransaction } from './filecoinSignTransaction';

import { polkadotGetAddress } from './polkadotGetAddress';
import { polkadotSignTransaction } from './polkadotSignTransaction';

import { kaspaGetAddress } from './kaspaGetAddress';
import { kaspaSignTransaction } from './kaspaSignTransaction';

import { nexaGetAddress } from './nexaGetAddress';
import { nexaSignTransaction } from './nexaSignTransaction';

import { nostrGetPublicKey } from './nostrGetPublicKey';
import { nostrSignEvent } from './nostrSignEvent';
import { nostrEncryptMessage } from './nostrEncryptMessage';
import { nostrDecryptMessage } from './nostrDecryptMessage';
import { nostrSignSchnorr } from './nostrSignSchnorr';

import { lnurlAuth } from './lnurlAuth';
import { nervosGetAddress } from './nervosGetAddress';
import { nervosSignTransaction } from './nervosSignTransaction';

import { dnxGetAddress } from './dnxGetAddress';
import { dnxSignTransaction } from './dnxSignTransaction';

import { deviceSpiFlashWrite } from './deviceSpiFlashWrite';
import { deviceSpiFlashRead } from './deviceSpiFlashRead';
import { deviceInfoSettings } from './deviceInfoSettings';
import { deviceGetInfo } from './deviceGetInfo';
import { deviceWriteSEPublicCert } from './deviceWriteSEPublicCert';
import { deviceReadSEPublicCert } from './deviceReadSEPublicCert';
import { deviceSESignMessage } from './deviceSESignMessage';
import { devicePing } from './devicePing';
import { deviceGetEntropy } from './deviceGetEntropy';
import { deviceSdProtect } from './deviceSdProtect';
import { deviceChangeWipeCode } from './deviceChangeWipeCode';
import { deviceEndSession } from './deviceEndSession';
import { deviceLoad } from './deviceLoad';
import { deviceDoPreauthorized } from './deviceDoPreauthorized';
import { deviceCancelAuthorization } from './deviceCancelAuthorization';
import { emmcDirList } from './emmcDirList';
import { emmcDirMake } from './emmcDirMake';
import { emmcDirRemove } from './emmcDirRemove';
import { emmcFileDelete } from './emmcFileDelete';
import { emmcFileRead } from './emmcFileRead';
import { emmcFileWrite } from './emmcFileWrite';
import { emmcFixPermission } from './emmcFixPermission';
import { emmcPathInfo } from './emmcPathInfo';
import { debugLinkDecision } from './debugLinkDecision';
import { debugLinkEraseSdCard } from './debugLinkEraseSdCard';
import { debugLinkFlashErase } from './debugLinkFlashErase';
import { debugLinkGetState } from './debugLinkGetState';
import { debugLinkMemoryRead } from './debugLinkMemoryRead';
import { debugLinkMemoryWrite } from './debugLinkMemoryWrite';
import { debugLinkRecordScreen } from './debugLinkRecordScreen';
import { debugLinkReseedRandom } from './debugLinkReseedRandom';
import { debugLinkStop } from './debugLinkStop';
import { debugLinkWatchLayout } from './debugLinkWatchLayout';
import { deviceGetFirmwareHash } from './deviceGetFirmwareHash';
import { deviceUnlockPath } from './deviceUnlockPath';
import { firmwareEraseEx } from './firmwareEraseEx';
import { firmwareErase } from './firmwareErase';
import { firmwareUpdateEmmcTest } from './firmwareUpdateEmmcTest';
import { firmwareUploadTest } from './firmwareUploadTest';
import { reboot } from './reboot';
import { selfTest } from './selfTest';
import { btcGetOwnershipId } from './btcGetOwnershipId';
import { btcGetOwnershipProof } from './btcGetOwnershipProof';
import { btcAuthorizeCoinJoin } from './btcAuthorizeCoinJoin';

/**
 * Crypto function
 */
import { cryptoBatchGetPublickeys } from './cryptoBatchGetPublickeys';
import { cryptoCipherKeyValue } from './cryptoCipherKeyValue';
import { cryptoCosiCommit } from './cryptoCosiCommit';
import { cryptoCosiSign } from './cryptoCosiSign';
import { cryptoGetECDHSessionKey } from './cryptoGetECDHSessionKey';
import { cryptoSignIdentity } from './cryptoSignIdentity';
import { nemDecryptMessage } from './nemDecryptMessage';
import { tezosGetAddress } from './tezosGetAddress';
import { tezosGetPublicKey } from './tezosGetPublicKey';
import { tezosSignTx } from './tezosSignTx';
import { moneroGetWatchKey } from './moneroGetWatchKey';
import { moneroGetAddress } from './moneroGetAddress';
import { eosGetPublicKey } from './eosGetPublicKey';
import { eosSignTx } from './eosSignTx';
import { binanceGetAddress } from './binanceGetAddress';
import { binanceGetPublicKey } from './binanceGetPublicKey';
import { binanceSignTx } from './binanceSignTx';
import { webAuthnAddResidentCredential } from './webAuthnAddResidentCredential';
import { webAuthnListResidentCredentials } from './webAuthnListResidentCredentials';
import { webAuthnRemoveResidentCredential } from './webAuthnRemoveResidentCredential';
import { getPublicKeyMultiple } from './getPublicKeyMultiple';
import { listResDir } from './listResDir';
import { nftWriteData } from './nftWriteData';
import { nftWriteInfo } from './nftWriteInfo';
import { readSEPublicKey } from './readSEPublicKey';
import { resourceUpdate } from './resourceUpdate';
import { bixinBackupDevice } from './bixinBackupDevice';
import { bixinLoadDevice } from './bixinLoadDevice';
import { bixinMessageSE } from './bixinMessageSE';
import { bixinVerifyDeviceRequest } from './bixinVerifyDeviceRequest';

import { tonGetAddress } from './tonGetAddress';
import { tonSignMessage } from './tonSignMessage';
import { tonSignProof } from './tonSignProof';

import { scdoGetAddress } from './scdoGetAddress';
import { scdoSignMessage } from './scdoSignMessage';
import { scdoSignTransaction } from './scdoSignTransaction';
import { alephiumGetAddress } from './alephiumGetAddress';
import { alephiumSignMessage } from './alephiumSignMessage';
import { alephiumSignTransaction } from './alephiumSignTransaction';

export * from './export';

export type CoreApi = {
  /**
   * Inject function
   */
  init: typeof init;
  on: typeof on;
  off: typeof off;
  emit: (event: string, ...args: any[]) => void;
  removeAllListeners: typeof removeAllListeners;
  dispose: () => void;
  call: (params: any) => Promise<any>;
  uiResponse: typeof uiResponse;
  cancel: (connectId?: string) => void;
  updateSettings: typeof updateSettings;
  getLogs: typeof getLogs;

  /**
   * Test function
   */
  testInitializeDeviceDuration: typeof testInitializeDeviceDuration;

  /**
   * Core function
   */
  checkAllFirmwareRelease: typeof checkAllFirmwareRelease;
  checkTransportRelease: typeof checkTransportRelease;
  checkBridgeStatus: typeof checkBridgeStatus;
  checkBridgeRelease: typeof checkBridgeRelease;
  checkBootloaderRelease: typeof checkBootloaderRelease;

  /**
   * Device function
   */
  searchDevices: typeof searchDevices;
  requestWebUsbDevice: typeof requestWebUsbDevice;
  getFeatures: typeof getFeatures;
  getOnekeyFeatures: typeof getOnekeyFeatures;
  getPassphraseState: typeof getPassphraseState;
  deviceBackup: typeof deviceBackup;
  deviceChangePin: typeof deviceChangePin;
  deviceFlags: typeof deviceFlags;
  deviceRebootToBoardloader: typeof deviceRebootToBoardloader;
  deviceRebootToBootloader: typeof deviceRebootToBootloader;
  deviceRecovery: typeof deviceRecovery;
  deviceReset: typeof deviceReset;
  deviceSettings: typeof deviceSettings;
  deviceUpdateReboot: typeof deviceUpdateReboot;
  deviceUploadResource: typeof deviceUploadResource;
  deviceSupportFeatures: typeof deviceSupportFeatures;
  deviceVerify: typeof deviceVerify;
  deviceWipe: typeof deviceWipe;
  deviceFullyUploadResource: typeof deviceFullyUploadResource;
  deviceUpdateBootloader: typeof deviceUpdateBootloader;
  deviceLock: typeof deviceLock;
  deviceCancel: typeof deviceCancel;
  getNextU2FCounter: typeof getNextU2FCounter;
  setU2FCounter: typeof setU2FCounter;
  checkFirmwareRelease: typeof checkFirmwareRelease;
  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;
  firmwareUpdate: typeof firmwareUpdate;
  firmwareUpdateV2: typeof firmwareUpdateV2;

  cipherKeyValue: typeof cipherKeyValue;

  /**
   * All network function
   */
  allNetworkGetAddress: typeof allNetworkGetAddress;

  /**
   * EVM function
   */
  evmGetAddress: typeof evmGetAddress;
  evmGetPublicKey: typeof evmGetPublicKey;
  evmSignMessage: typeof evmSignMessage;
  evmSignMessageEIP712: typeof evmSignMessageEIP712;
  evmSignTransaction: typeof evmSignTransaction;
  evmSignTypedData: typeof evmSignTypedData;
  evmVerifyMessage: typeof evmVerifyMessage;

  /**
   * EVM function
   */
  evmGetAddressTrezor: typeof evmGetAddressTrezor;
  evmGetPublicKeyTrezor: typeof evmGetPublicKeyTrezor;
  evmSignMessageTrezor: typeof evmSignMessageTrezor;
  evmSignTransactionTrezor: typeof evmSignTransactionTrezor;
  evmSignTypedDataTrezor: typeof evmSignTypedDataTrezor;
  evmVerifyMessageTrezor: typeof evmVerifyMessageTrezor;

  /**
   * BTC function
   */
  btcGetAddress: typeof btcGetAddress;
  btcGetPublicKey: typeof btcGetPublicKey;
  btcSignMessage: typeof btcSignMessage;
  btcSignPsbt: typeof btcSignPsbt;
  btcSignTransaction: typeof btcSignTransaction;
  btcVerifyMessage: typeof btcVerifyMessage;
  btcGetOwnershipId: typeof btcGetOwnershipId;
  btcGetOwnershipProof: typeof btcGetOwnershipProof;
  btcAuthorizeCoinJoin: typeof btcAuthorizeCoinJoin;

  /**
   * Crypto function
   */
  cryptoBatchGetPublickeys: typeof cryptoBatchGetPublickeys;
  cryptoCipherKeyValue: typeof cryptoCipherKeyValue;
  cryptoCosiCommit: typeof cryptoCosiCommit;
  cryptoCosiSign: typeof cryptoCosiSign;
  cryptoGetECDHSessionKey: typeof cryptoGetECDHSessionKey;
  cryptoSignIdentity: typeof cryptoSignIdentity;

  /**
   * Starcoin function
   */
  starcoinGetAddress: typeof starcoinGetAddress;
  starcoinGetPublicKey: typeof starcoinGetPublicKey;
  starcoinSignMessage: typeof starcoinSignMessage;
  starcoinSignTransaction: typeof starcoinSignTransaction;
  starcoinVerifyMessage: typeof starcoinVerifyMessage;

  /**
   * Nem function
   */
  nemGetAddress: typeof nemGetAddress;
  nemSignTransaction: typeof nemSignTransaction;
  nemDecryptMessage: typeof nemDecryptMessage;

  /**
   * Solana function
   */
  solGetAddress: typeof solGetAddress;
  solSignTransaction: typeof solSignTransaction;

  /**
   * Stellar function
   */
  stellarGetAddress: typeof stellarGetAddress;
  stellarSignTransaction: typeof stellarSignTransaction;

  /**
   * Tron function
   */
  tronGetAddress: typeof tronGetAddress;
  tronSignMessage: typeof tronSignMessage;
  tronSignTransaction: typeof tronSignTransaction;

  /**
   * Conflux function
   */
  confluxGetAddress: typeof confluxGetAddress;
  confluxSignMessage: typeof confluxSignMessage;
  confluxSignMessageCIP23: typeof confluxSignMessageCIP23;
  confluxSignTransaction: typeof confluxSignTransaction;

  /**
   * Near function
   */
  nearGetAddress: typeof nearGetAddress;
  nearSignTransaction: typeof nearSignTransaction;

  /**
   * Aptos function
   */
  aptosGetAddress: typeof aptosGetAddress;
  aptosGetPublicKey: typeof aptosGetPublicKey;
  aptosSignMessage: typeof aptosSignMessage;
  aptosSignTransaction: typeof aptosSignTransaction;

  /**
   * Algo function
   */
  algoGetAddress: typeof algoGetAddress;
  algoSignTransaction: typeof algoSignTransaction;

  /**
   * Cosmos function
   */
  cosmosGetAddress: typeof cosmosGetAddress;
  cosmosGetPublicKey: typeof cosmosGetPublicKey;
  cosmosSignTransaction: typeof cosmosSignTransaction;

  /**
   * XRP function
   */
  xrpGetAddress: typeof xrpGetAddress;
  xrpSignTransaction: typeof xrpSignTransaction;

  /**
   * SUI function
   */
  suiGetAddress: typeof suiGetAddress;
  suiGetPublicKey: typeof suiGetPublicKey;
  suiSignMessage: typeof suiSignMessage;
  suiSignTransaction: typeof suiSignTransaction;

  /**
   * Cardano function
   */
  cardanoGetAddress: typeof cardanoGetAddress;
  cardanoGetPublicKey: typeof cardanoGetPublicKey;
  cardanoSignTransaction: typeof cardanoSignTransaction;
  cardanoSignMessage: typeof cardanoSignMessage;

  /**
   * Filecoin function
   */
  filecoinGetAddress: typeof filecoinGetAddress;
  filecoinSignTransaction: typeof filecoinSignTransaction;

  /**
   * Polkadot function
   */
  polkadotGetAddress: typeof polkadotGetAddress;
  polkadotSignTransaction: typeof polkadotSignTransaction;

  /**
   * Kaspa function
   */
  kaspaGetAddress: typeof kaspaGetAddress;
  kaspaSignTransaction: typeof kaspaSignTransaction;

  /**
   * nexa function
   */
  nexaGetAddress: typeof nexaGetAddress;
  nexaSignTransaction: typeof nexaSignTransaction;

  /**
   * Nostr function
   */
  nostrGetPublicKey: typeof nostrGetPublicKey;
  nostrSignEvent: typeof nostrSignEvent;
  nostrEncryptMessage: typeof nostrEncryptMessage;
  nostrDecryptMessage: typeof nostrDecryptMessage;
  nostrSignSchnorr: typeof nostrSignSchnorr;

  /**
   * Lightning Network
   */
  lnurlAuth: typeof lnurlAuth;

  /**
   * Nervos Network
   */
  nervosGetAddress: typeof nervosGetAddress;
  nervosSignTransaction: typeof nervosSignTransaction;

  /**
   * Dnx Network
   */
  dnxGetAddress: typeof dnxGetAddress;
  dnxSignTransaction: typeof dnxSignTransaction;

  /**
   * TON Network
   */
  tonGetAddress: typeof tonGetAddress;
  tonSignMessage: typeof tonSignMessage;
  tonSignProof: typeof tonSignProof;

  /**
   * SCDO Network
   */
  scdoGetAddress: typeof scdoGetAddress;
  scdoSignMessage: typeof scdoSignMessage;
  scdoSignTransaction: typeof scdoSignTransaction;

  /**
   * Alephium Network
   */
  alephiumGetAddress: typeof alephiumGetAddress;
  alephiumSignMessage: typeof alephiumSignMessage;
  alephiumSignTransaction: typeof alephiumSignTransaction;

  deviceSpiFlashWrite: typeof deviceSpiFlashWrite;
  deviceSpiFlashRead: typeof deviceSpiFlashRead;
  deviceInfoSettings: typeof deviceInfoSettings;
  deviceGetInfo: typeof deviceGetInfo;
  deviceReadSEPublicCert: typeof deviceReadSEPublicCert;
  deviceWriteSEPublicCert: typeof deviceWriteSEPublicCert;
  deviceSESignMessage: typeof deviceSESignMessage;
  devicePing: typeof devicePing;
  deviceGetEntropy: typeof deviceGetEntropy;
  deviceGetFirmwareHash: typeof deviceGetFirmwareHash;
  deviceUnlockPath: typeof deviceUnlockPath;
  deviceSdProtect: typeof deviceSdProtect;
  deviceChangeWipeCode: typeof deviceChangeWipeCode;
  deviceEndSession: typeof deviceEndSession;
  deviceLoad: typeof deviceLoad;
  deviceDoPreauthorized: typeof deviceDoPreauthorized;
  deviceCancelAuthorization: typeof deviceCancelAuthorization;

  emmcDirList: typeof emmcDirList;
  emmcDirMake: typeof emmcDirMake;
  emmcDirRemove: typeof emmcDirRemove;
  emmcFileDelete: typeof emmcFileDelete;
  emmcFileRead: typeof emmcFileRead;
  emmcFileWrite: typeof emmcFileWrite;
  emmcFixPermission: typeof emmcFixPermission;
  emmcPathInfo: typeof emmcPathInfo;

  debugLinkDecision: typeof debugLinkDecision;
  debugLinkEraseSdCard: typeof debugLinkEraseSdCard;
  debugLinkFlashErase: typeof debugLinkFlashErase;
  debugLinkGetState: typeof debugLinkGetState;
  debugLinkMemoryRead: typeof debugLinkMemoryRead;
  debugLinkMemoryWrite: typeof debugLinkMemoryWrite;
  debugLinkRecordScreen: typeof debugLinkRecordScreen;
  debugLinkReseedRandom: typeof debugLinkReseedRandom;
  debugLinkStop: typeof debugLinkStop;
  debugLinkWatchLayout: typeof debugLinkWatchLayout;

  firmwareEraseEx: typeof firmwareEraseEx;
  firmwareErase: typeof firmwareErase;
  firmwareUpdateEmmcTest: typeof firmwareUpdateEmmcTest;
  firmwareUploadTest: typeof firmwareUploadTest;
  reboot: typeof reboot;
  selfTest: typeof selfTest;

  tezosGetAddress: typeof tezosGetAddress;
  tezosGetPublicKey: typeof tezosGetPublicKey;
  tezosSignTx: typeof tezosSignTx;

  binanceGetAddress: typeof binanceGetAddress;
  binanceGetPublicKey: typeof binanceGetPublicKey;
  binanceSignTx: typeof binanceSignTx;

  moneroGetWatchKey: typeof moneroGetWatchKey;
  moneroGetAddress: typeof moneroGetAddress;

  eosGetPublicKey: typeof eosGetPublicKey;
  eosSignTx: typeof eosSignTx;

  webAuthnAddResidentCredential: typeof webAuthnAddResidentCredential;
  webAuthnListResidentCredentials: typeof webAuthnListResidentCredentials;
  webAuthnRemoveResidentCredential: typeof webAuthnRemoveResidentCredential;

  getPublicKeyMultiple: typeof getPublicKeyMultiple;
  listResDir: typeof listResDir;
  nftWriteData: typeof nftWriteData;
  nftWriteInfo: typeof nftWriteInfo;
  readSEPublicKey: typeof readSEPublicKey;
  resourceUpdate: typeof resourceUpdate;

  bixinBackupDevice: typeof bixinBackupDevice;
  bixinLoadDevice: typeof bixinLoadDevice;
  bixinMessageSE: typeof bixinMessageSE;
  bixinVerifyDeviceRequest: typeof bixinVerifyDeviceRequest;
};
