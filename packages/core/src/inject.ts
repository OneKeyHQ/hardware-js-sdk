import { EventEmitter } from 'events';
import { CallMethod } from './events';
import { CoreApi } from './types/api';

export interface InjectApi {
  call: CallMethod;
  eventEmitter: EventEmitter;
  init: CoreApi['init'];
  dispose: () => void;
}

export const inject = ({ eventEmitter, init, call, dispose }: InjectApi): CoreApi => {
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

    /**
     * 搜索设备
     */
    searchDevices: () => call({ method: 'searchDevices' }),

    /**
     * 获取设备信息
     */
    getFeatures: params => call({ ...params, method: 'getFeatures' }),

    /**
     * 检查固件版本
     */
    checkFirmwareRelease: params => call({ ...params, method: 'checkFirmwareRelease' }),

    /**
     * 检查蓝牙固件版本
     */
    checkBLEFirmwareRelease: params => call({ ...params, method: 'checkBLEFirmwareRelease' }),

    /**
     * 检查 bridge 版本
     */
    checkTransportRelease: () => call({ method: 'checkTransportRelease' }),
  };
  return api;
};
