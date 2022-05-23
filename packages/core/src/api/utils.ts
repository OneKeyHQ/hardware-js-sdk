import * as ApiMethods from './index';
import { TypedError } from '../constants/errors';

export function findMethod(payload: any) {
  const { method } = payload;
  if (typeof method !== 'string') {
    throw TypedError('Method_InvalidParameter', 'Method is not set');
  }

  // @ts-expect-error
  const MethodConstructor = ApiMethods[method];
  if (MethodConstructor) {
    return new MethodConstructor(payload);
  }

  throw TypedError('Method_InvalidParameter', `Method ${method} is not set`);
}
