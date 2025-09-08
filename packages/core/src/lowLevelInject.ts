import { EventEmitter } from 'events';
import { CallMethod, CoreMessage, IFrameCallbackMessage } from './events';
import { CoreApi } from './types/api';
import { createCoreApi, executeCallback } from './inject';

type IAddHardwareGlobalEventListener = (coreMessage: CoreMessage) => void;
type IAddHardwareCallbackEventListener = (coreMessage: IFrameCallbackMessage) => void;

export interface LowLevelInjectApi {
  call: CallMethod;
  eventEmitter: EventEmitter;
  init: CoreApi['init'];
  dispose: CoreApi['dispose'];
  uiResponse: CoreApi['uiResponse'];
  cancel: CoreApi['cancel'];
  updateSettings: CoreApi['updateSettings'];
  switchTransport: CoreApi['switchTransport'];
  addHardwareGlobalEventListener: (listener: IAddHardwareGlobalEventListener) => void;
  addHardwareCallbackEventListener: (listener: IAddHardwareCallbackEventListener) => void;
}

export type LowLevelCoreApi = Omit<CoreApi, 'on' | 'off'> & {
  addHardwareGlobalEventListener: (listener: IAddHardwareGlobalEventListener) => void;
  addHardwareCallbackEventListener: (listener: IAddHardwareCallbackEventListener) => void;
};

export const lowLevelInject = ({
  call,
  cancel,
  dispose,
  eventEmitter,
  init,
  uiResponse,
  updateSettings,
  switchTransport,
  addHardwareGlobalEventListener,
  addHardwareCallbackEventListener,
}: LowLevelInjectApi): LowLevelCoreApi => {
  const api: LowLevelCoreApi = {
    addHardwareGlobalEventListener,
    addHardwareCallbackEventListener,
    removeAllListeners: type => {
      eventEmitter.removeAllListeners(type);
    },

    init,

    call,

    dispose,

    uiResponse,

    cancel,

    updateSettings,

    switchTransport,

    executeCallback: (id, ...args) => executeCallback(id, ...args),

    emit: () => {},

    ...createCoreApi(call),
  };
  return api;
};
