import { on, off, removeAllListeners } from './event';
import { searchDevices } from './searchDevices';
import { getFeatures } from './getFeatures';
import { checkFirmwareRelease } from './checkFirmwareRelease';
import { init } from './init';
import { checkBLEFirmwareRelease } from './checkBLEFirmwareRelease';
import { checkTransportRelease } from './checkTransportRelease';
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
  cancel: (params?: string) => void;

  /**
   * Core function
   */
  searchDevices: typeof searchDevices;

  getFeatures: typeof getFeatures;

  checkFirmwareRelease: typeof checkFirmwareRelease;

  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;

  checkTransportRelease: typeof checkTransportRelease;

  deviceBackup: typeof deviceBackup;
  deviceChangePin: typeof deviceChangePin;
  deviceFlags: typeof deviceFlags;
  deviceRebootToBootloader: typeof deviceRebootToBootloader;
  deviceRecovery: typeof deviceRecovery;
  deviceReset: typeof deviceReset;
  deviceSettings: typeof deviceSettings;
  deviceUpdateReboot: typeof deviceUpdateReboot;
  deviceWipe: typeof deviceWipe;

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
};
