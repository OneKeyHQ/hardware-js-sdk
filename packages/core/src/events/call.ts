import { serializeError } from '../constants/errors';
import { IFRAME } from './iframe';

export interface IFrameCallMessage {
  event: typeof IFRAME.CALL;
  type: typeof IFRAME.CALL;
  payload: any;
}

export const RESPONSE_EVENT = 'RESPONSE_EVENT';

export interface MethodResponseMessage {
  event: typeof RESPONSE_EVENT;
  type: typeof RESPONSE_EVENT;
  id: number;
  success: boolean;
  payload: any;
}

export const createResponseMessage = (
  id: number,
  success: boolean,
  payload: any
): MethodResponseMessage => ({
  event: RESPONSE_EVENT,
  type: RESPONSE_EVENT,
  id,
  success,

  payload: success ? payload : serializeError(payload),
});
