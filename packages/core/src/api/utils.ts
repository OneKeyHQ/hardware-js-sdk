import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import * as ApiMethods from './index';

import type { BaseMethod } from './BaseMethod';
import type { IFrameCallMessage } from '../events';

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
