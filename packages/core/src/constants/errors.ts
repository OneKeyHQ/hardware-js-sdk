import { HardwareError, ERRORS } from '@onekeyfe/hd-shared';

export const safeThrowError = (error: any) => {
  if (error instanceof HardwareError) {
    throw error;
  } else {
    throw ERRORS.TypedError(error);
  }
};
