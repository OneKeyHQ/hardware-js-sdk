import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import timer from './utils/timer';

import type { BlePlxManager } from './types';

export const subscribeBleOn = (bleManager: BlePlxManager, ms = 2000): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;
    let pendingError: Error | undefined;
    let cancelTimeout: () => void = () => undefined;
    let removeSubscription: () => void = () => undefined;

    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      cancelTimeout();
      removeSubscription();
      if (error) reject(error);
      else resolve();
    };

    const subscription = bleManager.onStateChange(state => {
      if (state === 'PoweredOn') {
        finish();
      } else if (state === 'PoweredOff') {
        pendingError = ERRORS.TypedError(HardwareErrorCode.BlePoweredOff);
      } else if (state === 'Unsupported') {
        pendingError = ERRORS.TypedError(HardwareErrorCode.BleUnsupported);
      } else if (state === 'Unauthorized') {
        pendingError = ERRORS.TypedError(HardwareErrorCode.BlePermissionError);
      } else {
        pendingError = undefined;
      }
    }, true);
    removeSubscription = () => subscription.remove();

    if (done) {
      removeSubscription();
    } else {
      cancelTimeout = timer.timeout(() => {
        finish(pendingError ?? ERRORS.TypedError(HardwareErrorCode.BleScanError));
      }, ms);
    }
  });
