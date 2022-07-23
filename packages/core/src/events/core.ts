import { HardwareError } from '@onekeyfe/hd-shared';
import { Unsuccessful } from '../types/params';
import { IFrameCallMessage, IFrameCancelMessage } from './call';
import { DeviceEventMessage } from './device';
import { IFrameEventMessage } from './iframe';
import { UiEventMessage } from './ui-request';
import { UiResponseMessage } from './ui-response';
import { LogEventMessage } from './log';

export const CORE_EVENT = 'CORE_EVENT';

export type CoreMessage = {
  id?: string;
  success?: true | false;
} & (
  | IFrameEventMessage
  | IFrameCallMessage
  | IFrameCancelMessage
  | UiResponseMessage
  | UiEventMessage
  | DeviceEventMessage
  | LogEventMessage
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
