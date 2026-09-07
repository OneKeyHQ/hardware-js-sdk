import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

const BLE_PLX_DEVICE_DISCONNECTED = 201;
const IOS_PERIPHERAL_DISCONNECTED = 7;

type NativeBleErrorFields = {
  errorCode?: unknown;
  iosErrorCode?: unknown;
  reason?: unknown;
  message?: unknown;
};

const nativeErrorText = (error: NativeBleErrorFields) =>
  [error.reason, error.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

export const isNativeBleDisconnectError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const nativeError = error as NativeBleErrorFields;
  return (
    nativeError.errorCode === BLE_PLX_DEVICE_DISCONNECTED ||
    nativeError.iosErrorCode === IOS_PERIPHERAL_DISCONNECTED
  );
};

export const toBleDisconnectHardwareError = (error: unknown) => {
  if ((error as { errorCode?: unknown })?.errorCode === HardwareErrorCode.BleDeviceDisconnected) {
    return error as Error;
  }

  const nativeError = (error ?? {}) as NativeBleErrorFields;
  return ERRORS.TypedError(
    HardwareErrorCode.BleDeviceDisconnected,
    nativeErrorText(nativeError) || undefined
  );
};
