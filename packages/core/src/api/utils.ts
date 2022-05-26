import * as ApiMethods from './index';
import { TypedError } from '../constants/errors';
import { IFrameCallMessage } from '../events';

export function findMethod(message: IFrameCallMessage & { id?: number }) {
  const { method } = message.payload;
  if (typeof method !== 'string') {
    throw TypedError('Method_InvalidParameter', 'Method is not set');
  }

  // @ts-expect-error
  const MethodConstructor = ApiMethods[method];
  if (MethodConstructor) {
    return new MethodConstructor(message);
  }

  throw TypedError('Method_InvalidParameter', `Method ${method} is not set`);
}
