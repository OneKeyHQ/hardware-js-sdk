import { off, on, removeAllListeners } from './event';
import { uiResponse } from './uiResponse';
import { init, updateSettings } from './init';

import { testInitializeDeviceDuration } from './testInitializeDeviceDuration';

import { getLogs } from './getLogs';
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
import { firmwareUpdate, firmwareUpdateV2, firmwareUpdateV3 } from './firmwareUpdate';
import { emmcFileWrite } from './emmcFileWrite';
import { promptWebDeviceAccess } from './promptWebDeviceAccess';

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
import { deviceUnlock } from './deviceUnlock';
import { deviceCancel } from './deviceCancel';

import { getNextU2FCounter } from './getNextU2FCounter';
import { setU2FCounter } from './setU2FCounter';

import { cipherKeyValue } from './cipherKeyValue';

import { allNetworkGetAddress, allNetworkGetAddressByLoop } from './allNetworkGetAddress';

import { evmGetAddress } from './evmGetAddress';
import { evmGetPublicKey } from './evmGetPublicKey';
import { evmSignMessage } from './evmSignMessage';
import { evmSignMessageEIP712 } from './evmSignMessageEIP712';
import { evmSignTransaction } from './evmSignTransaction';
import { evmSignTypedData } from './evmSignTypedData';
import { evmVerifyMessage } from './evmVerifyMessage';

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
import { solSignOffchainMessage } from './solSignOffchainMessage';
import { solSignMessage } from './solSignMessage';

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
import { aptosSignInMessage } from './aptosSignInMessage';
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

import { tonGetAddress } from './tonGetAddress';
import { tonSignMessage } from './tonSignMessage';
import { tonSignProof } from './tonSignProof';

import { scdoGetAddress } from './scdoGetAddress';
import { scdoSignMessage } from './scdoSignMessage';
import { scdoSignTransaction } from './scdoSignTransaction';
import { alephiumGetAddress } from './alephiumGetAddress';
import { alephiumSignMessage } from './alephiumSignMessage';
import { alephiumSignTransaction } from './alephiumSignTransaction';

import { benfenGetAddress } from './benfenGetAddress';
import { benfenGetPublicKey } from './benfenGetPublicKey';
import { benfenSignTransaction } from './benfenSignTransaction';
import { benfenSignMessage } from './benfenSignMessage';

import { neoGetAddress } from './neoGetAddress';
import { neoSignTransaction } from './neoSignTransaction';
import { ConnectSettings } from '../settings';

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
  switchTransport: (env: ConnectSettings['env']) => Promise<{ success: boolean }>;
  getLogs: typeof getLogs;

  /**
   * Test function
   */
  testInitializeDeviceDuration: typeof testInitializeDeviceDuration;

  /**
   * Core function
   */
  checkAllFirmwareRelease: typeof checkAllFirmwareRelease;
  checkBridgeStatus: typeof checkBridgeStatus;
  checkBridgeRelease: typeof checkBridgeRelease;
  checkBootloaderRelease: typeof checkBootloaderRelease;

  /**
   * Device function
   */
  searchDevices: typeof searchDevices;
  promptWebDeviceAccess: typeof promptWebDeviceAccess;
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
  deviceUnlock: typeof deviceUnlock;
  deviceCancel: typeof deviceCancel;
  getNextU2FCounter: typeof getNextU2FCounter;
  setU2FCounter: typeof setU2FCounter;
  checkFirmwareRelease: typeof checkFirmwareRelease;
  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;
  firmwareUpdate: typeof firmwareUpdate;
  firmwareUpdateV2: typeof firmwareUpdateV2;
  firmwareUpdateV3: typeof firmwareUpdateV3;
  emmcFileWrite: typeof emmcFileWrite;
  cipherKeyValue: typeof cipherKeyValue;

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

  /**
   * BTC function
   */
  btcGetAddress: typeof btcGetAddress;
  btcGetPublicKey: typeof btcGetPublicKey;
  btcSignMessage: typeof btcSignMessage;
  btcSignPsbt: typeof btcSignPsbt;
  btcSignTransaction: typeof btcSignTransaction;
  btcVerifyMessage: typeof btcVerifyMessage;

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
};
