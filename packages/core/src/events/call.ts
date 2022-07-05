import { serializeError } from '@onekeyfe/hd-shared';
import { IFRAME } from './iframe';
import { CommonParams, CoreApi } from '../types';

type UnwrappedResponse<T> = T extends Promise<infer R>
  ? R extends { success: true; payload: infer P }
    ? P
    : never
  : void;

type OverloadedMethod<T, E extends Record<string, string>> = T extends {
  (params: infer P1): infer R1;
  (params: infer P2): infer R2;
}
  ? ((params: P1 & E) => R1) | ((params: P2 & E) => R2) // - method IS overloaded, result depends on params (example: getAddress)
  : T extends (...args: infer P) => infer R
  ? (params: E & P[0]) => R // - method in NOT overloaded, one set of params and one set of result (example: signTransaction)
  : never;

type UnwrappedMethod<T, M extends Record<string, string>> = T extends () => infer R
  ? (params: M & CommonParams) => R // - method doesn't have params (example: dispose, disableWebUSB)
  : OverloadedMethod<T, M>;

type IsMethodCallable<T> = T extends (...args: any[]) => infer R
  ? R extends Promise<{ success: boolean }>
    ? R
    : never
  : never;

type CallApi = {
  [K in keyof CoreApi]: IsMethodCallable<CoreApi[K]> extends never
    ? never
    : UnwrappedMethod<CoreApi[K], { method: K }>;
};

export type CallMethodUnion = CallApi[keyof CallApi];
export type CallMethodPayload = Parameters<CallMethodUnion>[0];
export type CallMethodResponse<M extends keyof CallApi> = UnwrappedResponse<ReturnType<CallApi[M]>>;
export type CallMethodAnyResponse = ReturnType<CallMethodUnion>;

export type CallMethod = (params: CallMethodPayload) => Promise<any>;

export interface IFrameCallMessage {
  event: typeof IFRAME.CALL;
  type: typeof IFRAME.CALL;
  payload: CallMethodPayload;
}

export interface IFrameCancelMessage {
  event: typeof IFRAME.CANCEL;
  type: typeof IFRAME.CANCEL;
  payload: { connectId?: string };
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

export type CallMethodKeys = keyof CoreApi;
