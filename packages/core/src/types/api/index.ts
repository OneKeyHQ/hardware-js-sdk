import { on, off, removeAllListeners } from './event';
import { searchDevices } from './searchDevices';
import { getFeatures } from './getFeatures';
import { checkFirmwareRelease } from './checkFirmwareRelease';
import { init } from './init';
import { checkBLEFirmwareRelease } from './checkBLEFirmwareRelease';
import { checkTransportRelease } from './checkTransportRelease';
import { checkBridgeStatus } from './checkBridgeStatus';
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
import { btcSignTransaction } from './btcSignTransaction';
import { btcVerifyMessage } from './btcVerifyMessage';
import { uiResponse } from './uiResponse';
import { deviceReset } from './deviceReset';
import { deviceRecovery } from './deviceRecovery';
import { deviceVerify } from './deviceVerify';
import { deviceWipe } from './deviceWipe';
import { deviceRebootToBootloader } from './deviceRebootToBootloader';
import { deviceBackup } from './deviceBackup';
import { deviceChangePin } from './deviceChangePin';
import { deviceSettings } from './deviceSettings';
import { deviceFlags } from './deviceFlags';
import { deviceUpdateReboot } from './deviceUpdateReboot';
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
import { cipherKeyValue } from './cipherKeyValue';
import { firmwareUpdate } from './firmwareUpdate';
import { getLogs } from './getLogs';
import { deviceSupportFeatures } from './deviceSupportFeatures';
import { requestWebUsbDevice } from './requestWebUsbDevice';
import { getPassphraseState } from './getPassphraseState';
import { tronGetAddress } from './tronGetAddress';
import { tronSignTransaction } from './tronSignTransaction';
import { tronSignMessage } from './tronSignMessage';

export * from './export';

export type CoreApi = {
  /**
   * Inject function
   */
  init: typeof init;
  on: typeof on;
  off: typeof off;
  removeAllListeners: typeof removeAllListeners;
  dispose: () => void;
  call: (params: any) => Promise<any>;
  uiResponse: typeof uiResponse;
  cancel: (connectId?: string) => void;
  getLogs: typeof getLogs;

  /**
   * Core function
   */
  searchDevices: typeof searchDevices;

  requestWebUsbDevice: typeof requestWebUsbDevice;

  getFeatures: typeof getFeatures;

  checkFirmwareRelease: typeof checkFirmwareRelease;

  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;

  checkTransportRelease: typeof checkTransportRelease;

  checkBridgeStatus: typeof checkBridgeStatus;

  cipherKeyValue: typeof cipherKeyValue;

  deviceBackup: typeof deviceBackup;
  deviceChangePin: typeof deviceChangePin;
  deviceFlags: typeof deviceFlags;
  deviceRebootToBootloader: typeof deviceRebootToBootloader;
  deviceRecovery: typeof deviceRecovery;
  deviceReset: typeof deviceReset;
  deviceSettings: typeof deviceSettings;
  deviceUpdateReboot: typeof deviceUpdateReboot;
  deviceSupportFeatures: typeof deviceSupportFeatures;
  deviceVerify: typeof deviceVerify;
  deviceWipe: typeof deviceWipe;
  getPassphraseState: typeof getPassphraseState;

  evmGetAddress: typeof evmGetAddress;
  evmGetPublicKey: typeof evmGetPublicKey;
  evmSignMessage: typeof evmSignMessage;
  evmSignMessageEIP712: typeof evmSignMessageEIP712;
  evmSignTransaction: typeof evmSignTransaction;
  evmSignTypedData: typeof evmSignTypedData;
  evmVerifyMessage: typeof evmVerifyMessage;

  btcGetAddress: typeof btcGetAddress;
  btcGetPublicKey: typeof btcGetPublicKey;
  btcSignMessage: typeof btcSignMessage;
  btcSignTransaction: typeof btcSignTransaction;
  btcVerifyMessage: typeof btcVerifyMessage;

  starcoinGetAddress: typeof starcoinGetAddress;
  starcoinGetPublicKey: typeof starcoinGetPublicKey;
  starcoinSignMessage: typeof starcoinSignMessage;
  starcoinSignTransaction: typeof starcoinSignTransaction;
  starcoinVerifyMessage: typeof starcoinVerifyMessage;

  nemGetAddress: typeof nemGetAddress;
  nemSignTransaction: typeof nemSignTransaction;

  solGetAddress: typeof solGetAddress;
  solSignTransaction: typeof solSignTransaction;

  stellarGetAddress: typeof stellarGetAddress;
  stellarSignTransaction: typeof stellarSignTransaction;

  firmwareUpdate: typeof firmwareUpdate;

  tronGetAddress: typeof tronGetAddress;
  tronSignMessage: typeof tronSignMessage;
  tronSignTransaction: typeof tronSignTransaction;
};
