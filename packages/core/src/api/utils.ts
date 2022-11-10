import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import * as ApiMethods from './index';
import { IFrameCallMessage } from '../events';

export function findMethod(message: IFrameCallMessage & { id?: number }) {
  const { method } = message.payload;
  if (typeof method !== 'string') {
    throw ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, 'Method is not set');
  }

  // @ts-expect-error
  const MethodConstructor = ApiMethods[method];
  if (MethodConstructor) {
    return new MethodConstructor(message);
  }

  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    `Method ${method} is not set`
  );
}
