import { HardwareError, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

export const safeThrowError = (error: any) => {
  if (error instanceof HardwareError) {
    throw error;
  } else if (error.code === 'ERR_NETWORK') {
    throw ERRORS.TypedError(HardwareErrorCode.BridgeNotInstalled);
  } else if (error.code === 'ECONNABORTED') {
    throw ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError);
  } else {
    throw ERRORS.TypedError(HardwareErrorCode.UnknownError, error.message);
  }
};
