import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { VerifyState } from './types';

export function classifyRunnerFailure(
  errorCode: unknown
): Extract<VerifyState, 'skip' | 'warning' | 'fail'> {
  if (errorCode === HardwareErrorCode.DeviceNotSupportMethod) {
    return 'skip';
  }

  if (
    errorCode === HardwareErrorCode.PinCancelled ||
    errorCode === HardwareErrorCode.ActionCancelled
  ) {
    return 'warning';
  }

  return 'fail';
}
