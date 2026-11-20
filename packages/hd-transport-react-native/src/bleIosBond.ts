import { ERRORS, HardwareErrorCode, HardwareErrorCodeMessage } from '@onekeyfe/hd-shared';

/**
 * CoreBluetooth reports a bond the device no longer holds as
 * CBErrorPeerRemovedPairingInformation (14), either on the connect or on the
 * first GATT operation. ble-plx exposes it as `iosErrorCode`; the localized
 * `reason` is not used for matching.
 */
const IOS_PEER_REMOVED_PAIRING_INFORMATION = 14;

type NativeBleErrorFields = {
  iosErrorCode?: unknown;
  reason?: unknown;
  message?: unknown;
};

export const isIosPeerRemovedPairingInformation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as NativeBleErrorFields).iosErrorCode === IOS_PEER_REMOVED_PAIRING_INFORMATION;
};

export const toIosStaleBondError = (error: unknown) => {
  const nativeError = (error ?? {}) as NativeBleErrorFields;
  const nativeErrorMessage = [nativeError.reason, nativeError.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .slice(0, 240);
  return ERRORS.TypedError(
    HardwareErrorCode.BlePeerRemovedPairingInformation,
    HardwareErrorCodeMessage[HardwareErrorCode.BlePeerRemovedPairingInformation],
    {
      phase: 'connect',
      reason: 'peer_removed_pairing_information',
      ...(nativeErrorMessage ? { nativeErrorMessage } : {}),
    }
  );
};
