import { EventEmitter } from 'events';
import { CallMethod } from './events';
import { CoreApi } from './types/api';

export interface InjectApi {
  call: CallMethod;
  eventEmitter: EventEmitter;
  init: CoreApi['init'];
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
  uiResponse,
}: InjectApi): CoreApi => {
  const api: CoreApi = {
    on: <T extends string, P extends (...args: any[]) => any>(type: T, fn: P) => {
      eventEmitter.on(type, fn);
    },

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
    /**
     * 搜索设备
     */
    searchDevices: () => call({ method: 'searchDevices' }),

    /**
     * 获取设备信息
     */
    getFeatures: connectId => call({ connectId, method: 'getFeatures' }),

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

    deviceBackup: connectId => call({ connectId, method: 'deviceBackup' }),
    deviceChangePin: (connectId, params) =>
      call({ ...params, connectId, method: 'deviceChangePin' }),
    deviceFlags: (connectId, params) => call({ ...params, connectId, method: 'deviceFlags' }),
    deviceRebootToBootloader: connectId => call({ connectId, method: 'deviceRebootToBootloader' }),
    deviceRecovery: (connectId, params) => call({ ...params, connectId, method: 'deviceRecovery' }),
    deviceReset: (connectId, params) => call({ ...params, connectId, method: 'deviceReset' }),
    deviceSettings: connectId => call({ connectId, method: 'deviceSettings' }),
    deviceUpdateReboot: connectId => call({ connectId, method: 'deviceUpdateReboot' }),
    deviceWipe: connectId => call({ connectId, method: 'deviceWipe' }),

    evmGetAddress: (connectId, params) => call({ ...params, connectId, method: 'evmGetAddress' }),
    evmGetPublicKey: (connectId, params) =>
      call({ ...params, connectId, method: 'evmGetPublicKey' }),
    evmSignMessage: (connectId, params) => call({ ...params, connectId, method: 'evmSignMessage' }),
    evmSignMessageEIP712: (connectId, params) =>
      call({ ...params, connectId, method: 'evmSignMessageEIP712' }),
    evmSignTransaction: (connectId, params) =>
      call({ ...params, connectId, method: 'evmSignTransaction' }),
    evmSignTypedData: (connectId, params) =>
      call({ ...params, connectId, method: 'evmSignTypedData' }),
    evmVerifyMessage: (connectId, params) =>
      call({ ...params, connectId, method: 'evmVerifyMessage' }),

    btcGetAddress: (connectId, params) => call({ ...params, connectId, method: 'btcGetAddress' }),
    btcGetPublicKey: (connectId, params) =>
      call({ ...params, connectId, method: 'btcGetPublicKey' }),
    btcSignMessage: (connectId, params) => call({ ...params, connectId, method: 'btcSignMessage' }),
    btcSignTransaction: (connectId, params) =>
      call({ ...params, connectId, method: 'btcSignTransaction' }),
    btcVerifyMessage: (connectId, params) =>
      call({ ...params, connectId, method: 'btcVerifyMessage' }),

    starcoinGetAddress: (connectId, params) =>
      call({ ...params, connectId, method: 'starcoinGetAddress' }),
    starcoinGetPublicKey: (connectId, params) =>
      call({ ...params, connectId, method: 'starcoinGetPublicKey' }),
    starcoinSignMessage: (connectId, params) =>
      call({ ...params, connectId, method: 'starcoinSignMessage' }),
    starcoinSignTransaction: (connectId, params) =>
      call({ ...params, connectId, method: 'starcoinSignTransaction' }),
    starcoinVerifyMessage: (connectId, params) =>
      call({ ...params, connectId, method: 'starcoinVerifyMessage' }),
  };
  return api;
};
