import { EventEmitter } from 'events';
import { CallMethod } from './events';
import { CoreApi } from './types/api';

export interface InjectApi {
  call: CallMethod;
  eventEmitter: EventEmitter;
  init: CoreApi['init'];
  updateSettings: CoreApi['updateSettings'];
  dispose: CoreApi['dispose'];
  uiResponse: CoreApi['uiResponse'];
  cancel: CoreApi['cancel'];
}

export const inject = ({
  call,
  cancel,
  dispose,
  eventEmitter,
  init,
  updateSettings,
  uiResponse,
}: InjectApi): CoreApi => {
  const api: CoreApi = {
    on: <T extends string, P extends (...args: any[]) => any>(type: T, fn: P) => {
      eventEmitter.on(type, fn);
    },

    emit: () => {},

    off: (type, fn) => {
      eventEmitter.removeListener(type, fn);
    },

    removeAllListeners: type => {
      eventEmitter.removeAllListeners(type);
    },

    init,

    call,

    dispose,

    uiResponse,

    cancel,

    updateSettings,

    ...createCoreApi(call),
  };
  return api;
};

export const createCoreApi = (
  call: CoreApi['call']
): Omit<
  CoreApi,
  | 'on'
  | 'off'
  | 'emit'
  | 'removeAllListeners'
  | 'init'
  | 'call'
  | 'dispose'
  | 'uiResponse'
  | 'cancel'
  | 'updateSettings'
> => ({
  getLogs: () => call({ method: 'getLogs' }),
  /**
   * 搜索设备
   */
  searchDevices: () => call({ method: 'searchDevices' }),

  /**
   * 获取设备信息
   */
  getFeatures: (connectId, params) => call({ ...params, connectId, method: 'getFeatures' }),
  getOnekeyFeatures: (connectId, params) =>
    call({ ...params, connectId, method: 'getOnekeyFeatures' }),

  /**
   * 检查固件版本
   */
  checkFirmwareRelease: connectId => call({ connectId, method: 'checkFirmwareRelease' }),

  /**
   * 检查蓝牙固件版本
   */
  checkBLEFirmwareRelease: connectId => call({ connectId, method: 'checkBLEFirmwareRelease' }),

  /**
   * 检查 bridge 版本
   */
  checkTransportRelease: () => call({ method: 'checkTransportRelease' }),

  /**
   * 检查 Bridge 是否安装
   */
  checkBridgeStatus: () => call({ method: 'checkBridgeStatus' }),

  checkBridgeRelease: (connectId, params) =>
    call({ ...params, connectId, method: 'checkBridgeRelease' }),

  checkBootloaderRelease: (connectId, params) =>
    call({ ...params, connectId, method: 'checkBootloaderRelease' }),

  cipherKeyValue: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cipherKeyValue' }),

  deviceBackup: connectId => call({ connectId, method: 'deviceBackup' }),
  deviceChangePin: (connectId, params) => call({ ...params, connectId, method: 'deviceChangePin' }),
  deviceFlags: (connectId, params) => call({ ...params, connectId, method: 'deviceFlags' }),
  deviceRebootToBoardloader: connectId => call({ connectId, method: 'deviceRebootToBoardloader' }),
  deviceRebootToBootloader: connectId => call({ connectId, method: 'deviceRebootToBootloader' }),
  deviceRecovery: (connectId, params) => call({ ...params, connectId, method: 'deviceRecovery' }),
  deviceReset: (connectId, params) => call({ ...params, connectId, method: 'deviceReset' }),
  deviceSettings: (connectId, params) => call({ ...params, connectId, method: 'deviceSettings' }),
  deviceUpdateReboot: connectId => call({ connectId, method: 'deviceUpdateReboot' }),
  deviceUploadResource: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceUploadResource' }),
  deviceSupportFeatures: connectId => call({ connectId, method: 'deviceSupportFeatures' }),
  deviceVerify: (connectId, params) => call({ ...params, connectId, method: 'deviceVerify' }),
  deviceWipe: connectId => call({ connectId, method: 'deviceWipe' }),
  deviceFullyUploadResource: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceFullyUploadResource' }),
  deviceUpdateBootloader: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceUpdateBootloader' }),
  getPassphraseState: (connectId, params) =>
    call({ ...params, connectId, method: 'getPassphraseState' }),

  evmGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmGetAddress' }),
  evmGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmGetPublicKey' }),
  evmSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmSignMessage' }),
  evmSignMessageEIP712: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmSignMessageEIP712' }),
  evmSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmSignTransaction' }),
  evmSignTypedData: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmSignTypedData' }),
  evmVerifyMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'evmVerifyMessage' }),

  btcGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'btcGetAddress' }),
  btcGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'btcGetPublicKey' }),
  btcSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'btcSignMessage' }),
  btcSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'btcSignTransaction' }),
  btcVerifyMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'btcVerifyMessage' }),

  starcoinGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'starcoinGetAddress' }),
  starcoinGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'starcoinGetPublicKey' }),
  starcoinSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'starcoinSignMessage' }),
  starcoinSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'starcoinSignTransaction' }),
  starcoinVerifyMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'starcoinVerifyMessage' }),

  nemGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nemGetAddress' }),
  nemSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nemSignTransaction' }),

  solGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'solGetAddress' }),
  solSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'solSignTransaction' }),

  stellarGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'stellarGetAddress' }),
  stellarSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'stellarSignTransaction' }),

  firmwareUpdate: (connectId, params) => call({ ...params, connectId, method: 'firmwareUpdate' }),
  firmwareUpdateV2: (connectId, params) =>
    call({ ...params, connectId, method: 'firmwareUpdateV2' }),
  requestWebUsbDevice: () => call({ method: 'requestWebUsbDevice' }),

  tronGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'tronGetAddress' }),
  tronSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'tronSignMessage' }),
  tronSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'tronSignTransaction' }),

  confluxGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'confluxGetAddress' }),
  confluxSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'confluxSignMessage' }),
  confluxSignMessageCIP23: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'confluxSignMessageCIP23' }),
  confluxSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'confluxSignTransaction' }),

  nearGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nearGetAddress' }),
  nearSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nearSignTransaction' }),

  aptosGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'aptosGetAddress' }),
  aptosGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'aptosGetPublicKey' }),
  aptosSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'aptosSignMessage' }),
  aptosSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'aptosSignTransaction' }),

  algoGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'algoGetAddress' }),
  algoSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'algoSignTransaction' }),

  cosmosGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cosmosGetAddress' }),
  cosmosGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cosmosGetPublicKey' }),
  cosmosSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cosmosSignTransaction' }),

  xrpGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'xrpGetAddress' }),
  xrpSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'xrpSignTransaction' }),

  suiGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'suiGetAddress' }),
  suiGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'suiGetPublicKey' }),
  suiSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'suiSignMessage' }),
  suiSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'suiSignTransaction' }),

  cardanoGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cardanoGetAddress' }),
  cardanoGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cardanoGetPublicKey' }),
  cardanoSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cardanoSignTransaction' }),
  cardanoSignMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'cardanoSignMessage' }),

  filecoinGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'filecoinGetAddress' }),
  filecoinSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'filecoinSignTransaction' }),

  polkadotGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'polkadotGetAddress' }),
  polkadotSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'polkadotSignTransaction' }),

  kaspaGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'kaspaGetAddress' }),
  kaspaSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'kaspaSignTransaction' }),
  nexaGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nexaGetAddress' }),
  nexaSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nexaSignTransaction' }),

  nostrGetPublicKey: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nostrGetPublicKey' }),
  nostrSignEvent: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nostrSignEvent' }),
  nostrEncryptMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nostrEncryptMessage' }),
  nostrDecryptMessage: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nostrDecryptMessage' }),
  nostrSignSchnorr: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nostrSignSchnorr' }),
  lnurlAuth: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'lnurlAuth' }),

  nervosGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nervosGetAddress' }),
  nervosSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'nervosSignTransaction' }),

  dnxGetAddress: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'dnxGetAddress' }),
  dnxSignTransaction: (connectId, deviceId, params) =>
    call({ ...params, connectId, deviceId, method: 'dnxSignTransaction' }),
});
