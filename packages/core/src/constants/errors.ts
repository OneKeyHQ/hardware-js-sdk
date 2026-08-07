import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

export const safeThrowError = (error: any) => {
  if (error instanceof HardwareError) {
    throw error;
  } else if (error.code === 'ERR_NETWORK') {
    throw ERRORS.TypedError(HardwareErrorCode.BridgeNotInstalled);
  } else if (error.code === 'ECONNABORTED') {
    throw ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError);
  } else if (error.code === 'ERR_BAD_REQUEST') {
    throw ERRORS.TypedError(HardwareErrorCode.BridgeNetworkError);
  } else {
    const message = error?.message ?? String(error);
    const name = error?.name ? `${error.name}: ` : '';
    throw ERRORS.TypedError(HardwareErrorCode.UnknownError, `${name}${message}`);
  }
};
