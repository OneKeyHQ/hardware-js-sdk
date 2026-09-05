import {
  ERRORS,
  HardwareErrorCode,
  isBleStaleBondErrorText,
  isBleStaleBondHardwareError,
} from '@onekeyfe/hd-shared';

export { isBleStaleBondHardwareError };

const ATT_INSUFFICIENT_AUTHENTICATION = 5;
const ATT_INSUFFICIENT_ENCRYPTION = 15;
const IOS_PEER_REMOVED_PAIRING_INFORMATION = 14;

type NativeBleErrorFields = {
  attErrorCode?: unknown;
  androidErrorCode?: unknown;
  iosErrorCode?: unknown;
  reason?: unknown;
  message?: unknown;
};

const nativeErrorText = (error: NativeBleErrorFields) =>
  [error.reason, error.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

export const isNativeBleStaleBondError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' ? isBleStaleBondErrorText(error) : false;
  }

  const nativeError = error as NativeBleErrorFields;
  if (
    nativeError.attErrorCode === ATT_INSUFFICIENT_AUTHENTICATION ||
    nativeError.attErrorCode === ATT_INSUFFICIENT_ENCRYPTION ||
    nativeError.androidErrorCode === ATT_INSUFFICIENT_AUTHENTICATION ||
    nativeError.androidErrorCode === ATT_INSUFFICIENT_ENCRYPTION ||
    nativeError.iosErrorCode === IOS_PEER_REMOVED_PAIRING_INFORMATION
  ) {
    return true;
  }

  return isBleStaleBondErrorText(nativeErrorText(nativeError));
};

export const toBleStaleBondHardwareError = (error: unknown) => {
  if (isBleStaleBondHardwareError(error)) {
    return error as Error;
  }

  const nativeError = (error ?? {}) as NativeBleErrorFields;
  const text = nativeErrorText(nativeError);
  const normalizedText = text.toLowerCase();
  const peerRemoved =
    nativeError.iosErrorCode === IOS_PEER_REMOVED_PAIRING_INFORMATION ||
    normalizedText.includes('peer removed pairing information');

  return ERRORS.TypedError(
    peerRemoved
      ? HardwareErrorCode.BlePeerRemovedPairingInformation
      : HardwareErrorCode.BleDeviceBondError,
    text || undefined
  );
};
