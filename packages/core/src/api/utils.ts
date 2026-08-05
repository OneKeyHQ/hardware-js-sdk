import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import * as ApiMethods from './index';

import type { BaseMethod } from './BaseMethod';
import type { CoreMethodExtension } from './methodExtension';
import type { IFrameCallMessage } from '../events';

type MethodConstructor = new (message: IFrameCallMessage & { id?: number }) => BaseMethod<any>;

const publicMethodRegistry = ApiMethods as unknown as Record<string, MethodConstructor>;

export type FindMethodOptions = {
  extensions?: readonly CoreMethodExtension[];
  allowDestructiveOperations?: boolean;
};

const findExtensionMethod = (
  method: string,
  extensions: readonly CoreMethodExtension[]
): { constructor: MethodConstructor; destructive: boolean } | undefined => {
  let match: { constructor: MethodConstructor; destructive: boolean } | undefined;

  for (const extension of extensions) {
    const constructor = extension.methods[method];
    if (constructor) {
      if (match) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          `Method ${method} is registered by multiple extensions`
        );
      }
      match = {
        constructor,
        destructive: extension.destructiveMethods?.includes(method) === true,
      };
    }
  }

  return match;
};

export function findMethod(
  message: IFrameCallMessage & { id?: number },
  options: FindMethodOptions = {}
): BaseMethod<any> {
  const { method } = message.payload;
  if (typeof method !== 'string') {
    throw ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, 'Method is not set');
  }

  const MethodConstructor = publicMethodRegistry[method];
  if (MethodConstructor) {
    return new MethodConstructor(message);
  }

  const extensionMethod = findExtensionMethod(method, options.extensions ?? []);
  if (extensionMethod) {
    if (extensionMethod.destructive && options.allowDestructiveOperations !== true) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Destructive method ${method} requires allowDestructiveOperations`
      );
    }
    return new extensionMethod.constructor(message);
  }

  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    `Method ${method} is not set`
  );
}
