import { RESPONSE_EVENT } from '@onekeyfe/hd-core';
import { IReceiveMessage } from '../types';

export const createResponseMessage = (
  id: number,
  success: boolean,
  payload: any
): IReceiveMessage => ({
  event: RESPONSE_EVENT,
  type: RESPONSE_EVENT,
  id,
  success,
  payload,
  messageType: 'Receive',
});
