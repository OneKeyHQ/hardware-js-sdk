import type {
  deviceGetOnboardingStatus,
  deviceProvisionFactoryInfo,
  deviceReadFactoryCertificate,
  deviceReadFactoryInfo,
  deviceReboot,
  deviceUploadNft,
  deviceSignFactoryChallenge,
  deviceUploadWallpaper,
  deviceWriteFactoryCertificate,
  testProtocolV2Ping,
  uploadPortfolio,
} from './protocolV2';
import type { off, on, removeAllListeners } from './event';
import type { uiResponse } from './uiResponse';
import type { init, updateSettings } from './init';
import type { testInitializeDeviceDuration } from './testInitializeDeviceDuration';
import type { preInitialize } from './preInitialize';
import type { getLogs } from './getLogs';
import type { clearSessionCache } from './sessionCache';
import type { checkBridgeStatus } from './checkBridgeStatus';
import type { checkBridgeRelease } from './checkBridgeRelease';
import type { checkBootloaderRelease } from './checkBootloaderRelease';
import type { checkAllFirmwareRelease } from './checkAllFirmwareRelease';
import type { checkFirmwareTypeAvailable } from './checkFirmwareTypeAvailable';
import type { searchDevices } from './searchDevices';
import type { detectDeviceConnectProtocol } from './detectDeviceConnectProtocol';
import type { getFeatures } from './getFeatures';
import type { getDeviceState } from './getDeviceState';
import type { getOnekeyFeatures } from './getOnekeyFeatures';
import type { getPassphraseState } from './getPassphraseState';
import type { openWalletSession } from './openWalletSession';
import type { checkFirmwareRelease } from './checkFirmwareRelease';
import type { checkBLEFirmwareRelease } from './checkBLEFirmwareRelease';
import type {
  firmwareUpdate,
  firmwareUpdateV2,
  firmwareUpdateV3,
  firmwareUpdateV4,
} from './firmwareUpdate';
import type { promptWebDeviceAccess } from './promptWebDeviceAccess';
import type { deviceReset } from './deviceReset';
import type { deviceRecovery } from './deviceRecovery';
import type { deviceVerify } from './deviceVerify';
import type { deviceWipe } from './deviceWipe';
import type { deviceRebootToBootloader } from './deviceRebootToBootloader';
import type { deviceRebootToBoardloader } from './deviceRebootToBoardloader';
import type { deviceBackup } from './deviceBackup';
import type { deviceChangePin } from './deviceChangePin';
import type { deviceSettings } from './deviceSettings';
import type { deviceFlags } from './deviceFlags';
import type { deviceUpdateReboot } from './deviceUpdateReboot';
import type { deviceUploadResource } from './deviceUploadResource';
import type { deviceSupportFeatures } from './deviceSupportFeatures';
import type { deviceFullyUploadResource } from './deviceFullyUploadResource';
import type { deviceUpdateBootloader } from './deviceUpdateBootloader';
import type { deviceLock } from './deviceLock';
import type { deviceUnlock } from './deviceUnlock';
import type { deviceCancel } from './deviceCancel';
import type { getNextU2FCounter } from './getNextU2FCounter';
import type { setU2FCounter } from './setU2FCounter';
import type { cipherKeyValue } from './cipherKeyValue';
import type { allNetworkGetAddress, allNetworkGetAddressByLoop } from './allNetworkGetAddress';
import type { evmGetAddress } from './evmGetAddress';
import type { evmGetPublicKey } from './evmGetPublicKey';
import type { evmSignMessage } from './evmSignMessage';
import type { evmSignMessageEIP712 } from './evmSignMessageEIP712';
import type { evmSignTransaction } from './evmSignTransaction';
import type { evmSignTypedData } from './evmSignTypedData';
import type { evmVerifyMessage } from './evmVerifyMessage';
import type { btcGetAddress } from './btcGetAddress';
import type { btcGetPublicKey } from './btcGetPublicKey';
import type { btcSignMessage } from './btcSignMessage';
import type { btcSignPsbt } from './btcSignPsbt';
import type { btcSignTransaction } from './btcSignTransaction';
import type { btcVerifyMessage } from './btcVerifyMessage';
import type { starcoinGetAddress } from './starcoinGetAddress';
import type { starcoinGetPublicKey } from './starcoinGetPublicKey';
import type { starcoinSignMessage } from './starcoinSignMessage';
import type { starcoinSignTransaction } from './starcoinSignTransaction';
import type { starcoinVerifyMessage } from './starcoinVerifyMessage';
import type { nemGetAddress } from './nemGetAddress';
import type { nemSignTransaction } from './nemSignTransaction';
import type { solGetAddress } from './solGetAddress';
import type { solSignTransaction } from './solSignTransaction';
import type { solSignOffchainMessage } from './solSignOffchainMessage';
import type { solSignMessage } from './solSignMessage';
import type { stellarGetAddress } from './stellarGetAddress';
import type { stellarSignTransaction } from './stellarSignTransaction';
import type { tronGetAddress } from './tronGetAddress';
import type { tronSignTransaction } from './tronSignTransaction';
import type { tronSignMessage } from './tronSignMessage';
import type { confluxGetAddress } from './confluxGetAddress';
import type { confluxSignMessage } from './confluxSignMessage';
import type { confluxSignMessageCIP23 } from './confluxSignMessageCIP23';
import type { confluxSignTransaction } from './confluxSignTransaction';
import type { nearGetAddress } from './nearGetAddress';
import type { nearSignTransaction } from './nearSignTransaction';
import type { aptosGetAddress } from './aptosGetAddress';
import type { aptosGetPublicKey } from './aptosGetPublicKey';
import type { aptosSignMessage } from './aptosSignMessage';
import type { aptosSignInMessage } from './aptosSignInMessage';
import type { aptosSignTransaction } from './aptosSignTransaction';
import type { algoGetAddress } from './algoGetAddress';
import type { algoSignTransaction } from './algoSignTransaction';
import type { cosmosGetAddress } from './cosmosGetAddress';
import type { cosmosGetPublicKey } from './cosmosGetPublicKey';
import type { cosmosSignTransaction } from './cosmosSignTransaction';
import type { xrpGetAddress } from './xrpGetAddress';
import type { xrpSignTransaction } from './xrpSignTransaction';
import type { suiGetAddress } from './suiGetAddress';
import type { suiGetPublicKey } from './suiGetPublicKey';
import type { suiSignMessage } from './suiSignMessage';
import type { suiSignTransaction } from './suiSignTransaction';
import type { cardanoGetAddress } from './cardanoGetAddress';
import type { cardanoGetPublicKey } from './cardanoGetPublicKey';
import type { cardanoSignTransaction } from './cardanoSignTransaction';
import type { cardanoSignMessage } from './cardanoSignMessage';
import type { filecoinGetAddress } from './filecoinGetAddress';
import type { filecoinSignTransaction } from './filecoinSignTransaction';
import type { polkadotGetAddress } from './polkadotGetAddress';
import type { polkadotSignTransaction } from './polkadotSignTransaction';
import type { kaspaGetAddress } from './kaspaGetAddress';
import type { kaspaSignTransaction } from './kaspaSignTransaction';
import type { nexaGetAddress } from './nexaGetAddress';
import type { nexaSignTransaction } from './nexaSignTransaction';
import type { nostrGetPublicKey } from './nostrGetPublicKey';
import type { nostrSignEvent } from './nostrSignEvent';
import type { nostrEncryptMessage } from './nostrEncryptMessage';
import type { nostrDecryptMessage } from './nostrDecryptMessage';
import type { nostrSignSchnorr } from './nostrSignSchnorr';
import type { lnurlAuth } from './lnurlAuth';
import type { nervosGetAddress } from './nervosGetAddress';
import type { nervosSignTransaction } from './nervosSignTransaction';
import type { dnxGetAddress } from './dnxGetAddress';
import type { dnxSignTransaction } from './dnxSignTransaction';
import type { tonGetAddress } from './tonGetAddress';
import type { tonSignMessage } from './tonSignMessage';
import type { tonSignProof } from './tonSignProof';
import type { tonSignData } from './tonSignData';
import type { scdoGetAddress } from './scdoGetAddress';
import type { scdoSignMessage } from './scdoSignMessage';
import type { scdoSignTransaction } from './scdoSignTransaction';
import type { alephiumGetAddress } from './alephiumGetAddress';
import type { alephiumSignMessage } from './alephiumSignMessage';
import type { alephiumSignTransaction } from './alephiumSignTransaction';
import type { benfenGetAddress } from './benfenGetAddress';
import type { benfenGetPublicKey } from './benfenGetPublicKey';
import type { benfenSignTransaction } from './benfenSignTransaction';
import type { benfenSignMessage } from './benfenSignMessage';
import type { neoGetAddress } from './neoGetAddress';
import type { neoSignTransaction } from './neoSignTransaction';
import type { evmGetAddressTrezor } from './evmGetAddressTrezor';
import type { evmGetPublicKeyTrezor } from './evmGetPublicKeyTrezor';
import type { evmSignMessageTrezor } from './evmSignMessageTrezor';
import type { evmSignTransactionTrezor } from './evmSignTransactionTrezor';
import type { evmSignTypedDataTrezor } from './evmSignTypedDataTrezor';
import type { evmVerifyMessageTrezor } from './evmVerifyMessageTrezor';
import type { btcGetOwnershipId } from './btcGetOwnershipId';
import type { btcGetOwnershipProof } from './btcGetOwnershipProof';
import type { btcAuthorizeCoinJoin } from './btcAuthorizeCoinJoin';
import type { cryptoBatchGetPublickeys } from './cryptoBatchGetPublickeys';
import type { cryptoCipherKeyValue } from './cryptoCipherKeyValue';
import type { cryptoCosiCommit } from './cryptoCosiCommit';
import type { cryptoCosiSign } from './cryptoCosiSign';
import type { cryptoGetECDHSessionKey } from './cryptoGetECDHSessionKey';
import type { cryptoSignIdentity } from './cryptoSignIdentity';
import type { nemDecryptMessage } from './nemDecryptMessage';
import type { deviceSpiFlashWrite } from './deviceSpiFlashWrite';
import type { deviceSpiFlashRead } from './deviceSpiFlashRead';
import type { deviceInfoSettings } from './deviceInfoSettings';
import type { deviceGetInfo } from './deviceGetInfo';
import type { deviceWriteSEPrivateKey } from './deviceWriteSEPrivateKey';
import type { deviceWriteSEPublicCert } from './deviceWriteSEPublicCert';
import type { deviceReadSEPublicCert } from './deviceReadSEPublicCert';
import type { deviceSESignMessage } from './deviceSESignMessage';
import type { devicePing } from './devicePing';
import type { deviceGetEntropy } from './deviceGetEntropy';
import type { deviceGetFirmwareHash } from './deviceGetFirmwareHash';
import type { deviceUnlockPath } from './deviceUnlockPath';
import type { deviceSdProtect } from './deviceSdProtect';
import type { deviceChangeWipeCode } from './deviceChangeWipeCode';
import type { deviceEndSession } from './deviceEndSession';
import type { deviceLoad } from './deviceLoad';
import type { deviceDoPreauthorized } from './deviceDoPreauthorized';
import type { deviceCancelAuthorization } from './deviceCancelAuthorization';
import type { emmcDirList } from './emmcDirList';
import type { emmcDirMake } from './emmcDirMake';
import type { emmcDirRemove } from './emmcDirRemove';
import type { emmcFileDelete } from './emmcFileDelete';
import type { emmcFileRead } from './emmcFileRead';
import type { emmcFileWrite } from './emmcFileWrite';
import type { emmcFixPermission } from './emmcFixPermission';
import type { emmcPathInfo } from './emmcPathInfo';
import type { debugLinkDecision } from './debugLinkDecision';
import type { debugLinkEraseSdCard } from './debugLinkEraseSdCard';
import type { debugLinkFlashErase } from './debugLinkFlashErase';
import type { debugLinkGetState } from './debugLinkGetState';
import type { debugLinkMemoryRead } from './debugLinkMemoryRead';
import type { debugLinkMemoryWrite } from './debugLinkMemoryWrite';
import type { debugLinkRecordScreen } from './debugLinkRecordScreen';
import type { debugLinkReseedRandom } from './debugLinkReseedRandom';
import type { debugLinkStop } from './debugLinkStop';
import type { debugLinkWatchLayout } from './debugLinkWatchLayout';
import type { firmwareEraseEx } from './firmwareEraseEx';
import type { firmwareErase } from './firmwareErase';
import type { firmwareUpdateEmmcTest } from './firmwareUpdateEmmcTest';
import type { firmwareUploadTest } from './firmwareUploadTest';
import type { reboot } from './reboot';
import type { selfTest } from './selfTest';
import type { tezosGetAddress } from './tezosGetAddress';
import type { tezosGetPublicKey } from './tezosGetPublicKey';
import type { tezosSignTx } from './tezosSignTx';
import type { moneroGetWatchKey } from './moneroGetWatchKey';
import type { moneroGetAddress } from './moneroGetAddress';
import type { eosGetPublicKey } from './eosGetPublicKey';
import type { eosSignTx } from './eosSignTx';
import type { binanceGetAddress } from './binanceGetAddress';
import type { binanceGetPublicKey } from './binanceGetPublicKey';
import type { binanceSignTx } from './binanceSignTx';
import type { webAuthnAddResidentCredential } from './webAuthnAddResidentCredential';
import type { webAuthnListResidentCredentials } from './webAuthnListResidentCredentials';
import type { webAuthnRemoveResidentCredential } from './webAuthnRemoveResidentCredential';
import type { getPublicKeyMultiple } from './getPublicKeyMultiple';
import type { listResDir } from './listResDir';
import type { nftWriteData } from './nftWriteData';
import type { nftWriteInfo } from './nftWriteInfo';
import type { readSEPublicKey } from './readSEPublicKey';
import type { resourceUpdate } from './resourceUpdate';
import type { bixinBackupDevice } from './bixinBackupDevice';
import type { bixinLoadDevice } from './bixinLoadDevice';
import type { bixinMessageSE } from './bixinMessageSE';
import type { bixinVerifyDeviceRequest } from './bixinVerifyDeviceRequest';
import type { ConnectSettings } from '../settings';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';

export * from './export';
export type { DeviceStateScope, GetDeviceStateParams } from './getDeviceState';
export type { GetPassphraseStateParams } from './getPassphraseState';
export { OpenWalletSessionMode } from './openWalletSession';
export type {
  OpenWalletSessionModeValue,
  OpenWalletSessionParams,
  OpenWalletSessionPayload,
} from './openWalletSession';
export type { ClearSessionCacheParams, ClearSessionCachePayload } from './sessionCache';
export type {
  DeviceFactoryCertificateWriteParams,
  DeviceFactoryChallengeSignParams,
  DeviceFactoryInfoSetParams,
  TestProtocolV2PingParams,
} from './protocolV2';

export type CoreApi = {
  /**
   * Inject function
   */
  init: typeof init;
  on: typeof on;
  off: typeof off;
  emit: (event: string, ...args: any[]) => void;
  removeAllListeners: typeof removeAllListeners;
  dispose: () => void | Promise<void>;
  call: (params: any) => Promise<any>;
  /**
   * Bind a protocol that has already been verified for one transport endpoint.
   * Every later SDK call for the same connectId uses it as a strict expectation.
   */
  setDeviceConnectProtocol: (
    connectId: string,
    connectProtocol: HardwareConnectProtocol | undefined
  ) => void;
  uiResponse: typeof uiResponse;
  cancel: (connectId?: string) => void;
  updateSettings: typeof updateSettings;
  switchTransport: (env: ConnectSettings['env']) => Promise<{ success: boolean }>;
  getLogs: typeof getLogs;
  clearSessionCache: typeof clearSessionCache;

  /**
   * Test function
   */
  testInitializeDeviceDuration: typeof testInitializeDeviceDuration;
  testProtocolV2Ping: typeof testProtocolV2Ping;
  preInitialize: typeof preInitialize;

  /**
   * Core function
   */
  checkAllFirmwareRelease: typeof checkAllFirmwareRelease;
  checkBridgeStatus: typeof checkBridgeStatus;
  checkBridgeRelease: typeof checkBridgeRelease;
  checkBootloaderRelease: typeof checkBootloaderRelease;
  checkFirmwareTypeAvailable: typeof checkFirmwareTypeAvailable;

  /**
   * Device function
   */
  searchDevices: typeof searchDevices;
  detectDeviceConnectProtocol: typeof detectDeviceConnectProtocol;
  promptWebDeviceAccess: typeof promptWebDeviceAccess;
  getFeatures: typeof getFeatures;
  getDeviceState: typeof getDeviceState;
  getOnekeyFeatures: typeof getOnekeyFeatures;
  getPassphraseState: typeof getPassphraseState;
  openWalletSession: typeof openWalletSession;
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
  deviceUnlock: typeof deviceUnlock;
  deviceCancel: typeof deviceCancel;
  getNextU2FCounter: typeof getNextU2FCounter;
  setU2FCounter: typeof setU2FCounter;
  checkFirmwareRelease: typeof checkFirmwareRelease;
  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;
  firmwareUpdate: typeof firmwareUpdate;
  firmwareUpdateV2: typeof firmwareUpdateV2;
  firmwareUpdateV3: typeof firmwareUpdateV3;
  firmwareUpdateV4: typeof firmwareUpdateV4;
  cipherKeyValue: typeof cipherKeyValue;

  /**
   * Pro2 business API
   */
  deviceReboot: typeof deviceReboot;
  deviceGetOnboardingStatus: typeof deviceGetOnboardingStatus;
  deviceUploadNft: typeof deviceUploadNft;
  deviceProvisionFactoryInfo: typeof deviceProvisionFactoryInfo;
  deviceReadFactoryInfo: typeof deviceReadFactoryInfo;
  deviceWriteFactoryCertificate: typeof deviceWriteFactoryCertificate;
  deviceReadFactoryCertificate: typeof deviceReadFactoryCertificate;
  deviceSignFactoryChallenge: typeof deviceSignFactoryChallenge;
  deviceUploadWallpaper: typeof deviceUploadWallpaper;
  uploadPortfolio: typeof uploadPortfolio;

  /**
   * All network function
   */
  allNetworkGetAddress: typeof allNetworkGetAddress;
  allNetworkGetAddressByLoop: typeof allNetworkGetAddressByLoop;

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
  solSignOffchainMessage: typeof solSignOffchainMessage;
  solSignMessage: typeof solSignMessage;

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
  aptosSignInMessage: typeof aptosSignInMessage;
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
  tonSignData: typeof tonSignData;

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

  /**
   * Benfen Network
   */
  benfenGetAddress: typeof benfenGetAddress;
  benfenGetPublicKey: typeof benfenGetPublicKey;
  benfenSignTransaction: typeof benfenSignTransaction;
  benfenSignMessage: typeof benfenSignMessage;

  /**
   * Neo Network
   */
  neoGetAddress: typeof neoGetAddress;
  neoSignTransaction: typeof neoSignTransaction;

  /**
   * Test-only APIs.
   */
  deviceSpiFlashWrite: typeof deviceSpiFlashWrite;
  deviceSpiFlashRead: typeof deviceSpiFlashRead;
  deviceInfoSettings: typeof deviceInfoSettings;
  deviceGetInfo: typeof deviceGetInfo;
  deviceWriteSEPrivateKey: typeof deviceWriteSEPrivateKey;
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
