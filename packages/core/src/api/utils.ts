import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import * as ApiMethods from './index';

import type { BaseMethod } from './BaseMethod';
import type { IFrameCallMessage } from '../events';
import type { ProtocolType } from '@onekeyfe/hd-transport';

type MethodConstructor = new (message: IFrameCallMessage & { id?: number }) => BaseMethod<any>;

const publicMethodRegistry = ApiMethods as unknown as Record<string, MethodConstructor>;

export function findMethod(message: IFrameCallMessage & { id?: number }): BaseMethod<any> {
  const { method } = message.payload;
  if (typeof method !== 'string') {
    throw ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, 'Method is not set');
  }

  const MethodConstructor = publicMethodRegistry[method];
  if (MethodConstructor) {
    return new MethodConstructor(message);
  }

  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    `Method ${method} is not set`
  );
}

/**
 * Read the protocol contract from the same method instance used by the Core dispatcher.
 * Passing a payload initializes the method first so parameter-dependent contracts, such
 * as Bitcoin fork support, are evaluated with the actual request.
 */
export function getMethodSupportedProtocols(
  method: string,
  payload?: Record<string, unknown>
): readonly ProtocolType[] {
  const instance = findMethod({
    id: 0,
    payload: {
      ...payload,
      method,
    },
  } as unknown as IFrameCallMessage);

  if (payload !== undefined) {
    instance.init();
  }

  return instance.getSupportedProtocols();
}
