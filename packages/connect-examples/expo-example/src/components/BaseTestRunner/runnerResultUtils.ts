import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { ItemVerifyState } from './Context/TestRunnerVerifyProvider';
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

export function getRunnerReportStatus(states: (VerifyState | undefined)[]): string {
  if (states.includes('fail')) return 'Fail';
  if (
    states.length === 0 ||
    states.some(state => !state || state === 'none' || state === 'pending')
  ) {
    return 'Incomplete';
  }
  if (states.includes('warning')) return 'Warning';
  if (states.every(state => state === 'skip')) return 'Skipped';
  return 'Success';
}

export function getRunnerReportResult(state: ItemVerifyState | undefined, successResult: unknown) {
  switch (state?.verify) {
    case 'success':
      return successResult;
    case 'fail':
      return state.error || 'Fail';
    case 'warning':
      return state.error || 'Warning';
    case 'skip':
      return state.error ? `Skipped: ${state.error}` : 'Skipped';
    default:
      return 'Not run';
  }
}
