import { HardwareError } from '@onekeyfe/hd-shared';

import type { Unsuccessful } from '../types/params';
import type {
  IFrameCallMessage,
  IFrameCallbackMessage,
  IFrameCancelMessage,
  IFrameCancelOperationMessage,
  IFrameSwitchTransportMessage,
} from './call';
import type { DeviceEventMessage } from './device';
import type { IFrameEventMessage } from './iframe';
import type { UiEventMessage } from './ui-request';
import type { UiResponseMessage } from './ui-response';
import type { LogEventMessage } from './log';
import type { FirmwareMessage } from './firmware';

export const CORE_EVENT = 'CORE_EVENT';

export type CoreMessage = {
  id?: string;
  success?: true | false;
} & (
  | IFrameEventMessage
  | IFrameCallMessage
  | IFrameCancelMessage
  | IFrameCancelOperationMessage
  | IFrameSwitchTransportMessage
  | IFrameCallbackMessage
  | UiResponseMessage
  | UiEventMessage
  | DeviceEventMessage
  | LogEventMessage
  | FirmwareMessage
);

export type PostMessageEvent = MessageEvent<any>;

export const parseMessage = (messageData: any): CoreMessage => {
  const { data } = messageData;
  const message: CoreMessage = {
    event: data.event,
    type: data.type,
    payload: data.payload,
  };

  if (typeof messageData.id === 'number') {
    message.id = messageData.id;
  }

  if (typeof message.success === 'boolean') {
    message.success = data.success;
  }

  return message;
};

export const createErrorMessage = (error: Error & { code?: string | number }): Unsuccessful => {
  let payload = { error: error.message, code: error.code };
  if (error instanceof HardwareError) {
    payload = { error: error.message, code: error.errorCode };
  }
  return {
    success: false,
    payload,
  };
};
