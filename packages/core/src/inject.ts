import { EventEmitter } from 'events';
import { CoreApi } from './types/api';

export interface InjectApi {
  call: (params: any) => Promise<any>;
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

    searchDevices: () => call({ method: 'searchDevices' }),
  };
  return api;
};
