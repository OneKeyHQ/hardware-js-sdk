import { createCoreApi, createProtocolAwareCall } from './inject';

import type { EventEmitter } from 'events';
import type { CallMethod, CoreMessage } from './events';
import type { CoreApi } from './types/api';

type IAddHardwareGlobalEventListener = (coreMessage: CoreMessage) => void;

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
}

export type LowLevelCoreApi = Omit<CoreApi, 'on' | 'off'> & {
  addHardwareGlobalEventListener: (listener: IAddHardwareGlobalEventListener) => void;
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
}: LowLevelInjectApi): LowLevelCoreApi => {
  const protocolAwareCall = createProtocolAwareCall(call);
  const api: LowLevelCoreApi = {
    addHardwareGlobalEventListener,
    removeAllListeners: type => {
      eventEmitter.removeAllListeners(type);
    },

    init,

    call: protocolAwareCall.call,

    setDeviceConnectProtocol: protocolAwareCall.setDeviceConnectProtocol,

    dispose,

    uiResponse,

    cancel,

    updateSettings,

    switchTransport,

    emit: () => {},

    ...createCoreApi(protocolAwareCall.call),
  };
  return api;
};
