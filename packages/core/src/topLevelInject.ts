import EventEmitter from 'events';
import { CoreApi } from './types/api';
import { createCoreApi } from './inject';
import type { LowLevelCoreApi } from './lowLevelInject';

export interface TopLevelInjectApi {
  init: CoreApi['init'];
  call: CoreApi['call'];
}

const eventEmitter = new EventEmitter();

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
      lowLevelApi?.removeAllListeners(type);
    },

    dispose: () => lowLevelApi?.dispose(),

    uiResponse: response => lowLevelApi?.uiResponse(response),

    cancel: (connectId?: string) => lowLevelApi?.cancel(connectId),

    updateSettings: settings => lowLevelApi?.updateSettings(settings) ?? Promise.resolve(false),
  };

  return api;
};
