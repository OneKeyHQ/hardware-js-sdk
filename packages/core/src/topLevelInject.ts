import EventEmitter from 'events';
import { CoreApi } from './types/api';
import { createCoreApi } from './inject';
import type { LowLevelCoreApi } from './lowLevelInject';

export interface TopLevelInjectApi {
  init: CoreApi['init'];
  call: CoreApi['call'];
}

const eventEmitter = new EventEmitter();

const EmptyFN = () => {};

export const topLevelInject = () => {
  let lowLevelApi: LowLevelCoreApi | undefined;
  const call = (params: any) => {
    if (!lowLevelApi) return Promise.resolve(undefined);
    return lowLevelApi.call(params);
  };
  const api: CoreApi = {
    on: <T extends string, P extends (...args: any[]) => any>(type: T, fn: P) => {
      eventEmitter.on(type, fn);
    },

    emit: (eventName: string, ...args: any[]) => {
      eventEmitter.emit(eventName, ...args);
    },

    off: (type, fn) => {
      eventEmitter.emit(type, fn);
    },

    init: (settings, hardwareLowLeverApi) => {
      lowLevelApi = hardwareLowLeverApi;
      return lowLevelApi?.init(settings) ?? Promise.resolve(false);
    },

    call,

    ...createCoreApi(call),

    removeAllListeners: type => {
      eventEmitter.removeAllListeners(type);
    },

    dispose: lowLevelApi?.dispose ?? EmptyFN,

    uiResponse: lowLevelApi?.uiResponse ?? EmptyFN,

    cancel: lowLevelApi?.cancel ?? EmptyFN,
  };

  return api;
};
