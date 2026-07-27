import { HardwareErrorCode } from '@onekeyfe/hd-shared';

export function isDeviceLockedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errorCode' in error &&
    error.errorCode === HardwareErrorCode.DeviceLocked
  );
}
