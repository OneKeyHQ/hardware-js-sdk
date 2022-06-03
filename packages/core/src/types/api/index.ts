import { on, off, removeAllListeners } from './event';
import { searchDevices } from './searchDevices';
import { getFeatures } from './getFeatures';
import { checkFirmwareRelease } from './checkFirmwareRelease';
import { init } from './init';
import { checkBLEFirmwareRelease } from './checkBLEFirmwareRelease';
import { checkTransportRelease } from './checkTransportRelease';
import { btcGetAddress } from './btcGetAddress';
import { btcGetPublicKey } from './btcGetPublicKey';
import { btcSignMessage } from './btcSignMessage';
import { btcVerifyMessage } from './btcVerifyMessage';
import { evmGetAddress } from './evmGetAddress';
import { evmGetPublicKey } from './evmGetPublicKey';
import { evmSignMessage } from './evmSignMessage';
import { evmSignMessageEIP712 } from './evmSignMessageEIP712';
import { evmSignTransaction } from './evmSignTransaction';
import { evmVerifyMessage } from './evmVerifyMessage';

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

  /**
   * Core function
   */
  searchDevices: typeof searchDevices;

  getFeatures: typeof getFeatures;

  checkFirmwareRelease: typeof checkFirmwareRelease;

  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;

  checkTransportRelease: typeof checkTransportRelease;

  evmGetAddress: typeof evmGetAddress;
  evmGetPublicKey: typeof evmGetPublicKey;
  evmSignMessage: typeof evmSignMessage;
  evmSignMessageEIP712: typeof evmSignMessageEIP712;
  evmSignTransaction: typeof evmSignTransaction;
  evmVerifyMessage: typeof evmVerifyMessage;

  btcGetAddress: typeof btcGetAddress;
  btcGetPublicKey: typeof btcGetPublicKey;
  btcSignMessage: typeof btcSignMessage;
  btcVerifyMessage: typeof btcVerifyMessage;
};
