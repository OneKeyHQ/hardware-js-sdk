import { Unsuccessful } from '../types/params';
import { IFrameCallMessage } from './call';
import { DeviceEventMessage } from './device';
import { IFrameEventMessage } from './iframe';
import { UiEventMessage } from './ui-request';
import { UiResponseMessage } from './ui-response';

export const CORE_EVENT = 'CORE_EVENT';

export type CoreMessage = {
  id?: string;
  success?: true | false;
} & (
  | IFrameEventMessage
  | IFrameCallMessage
  | UiResponseMessage
  | UiEventMessage
  | DeviceEventMessage
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

export const createErrorMessage = (error: Error & { code?: string }): Unsuccessful => ({
  success: false,
  payload: {
    error: error.message,
    code: error.code,
  },
});
