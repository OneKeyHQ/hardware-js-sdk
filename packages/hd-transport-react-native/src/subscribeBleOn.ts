import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import timer from './utils/timer';

import type { BlePlxManager } from './types';

export const subscribeBleOn = (bleManager: BlePlxManager, ms = 1000): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;
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
        finish(ERRORS.TypedError(HardwareErrorCode.BlePoweredOff));
      } else if (state === 'Unsupported') {
        finish(ERRORS.TypedError(HardwareErrorCode.BleUnsupported));
      } else if (state === 'Unauthorized') {
        finish(ERRORS.TypedError(HardwareErrorCode.BlePermissionError));
      }
    }, true);
    removeSubscription = () => subscription.remove();

    if (done) {
      removeSubscription();
    } else {
      cancelTimeout = timer.timeout(() => {
        finish(ERRORS.TypedError(HardwareErrorCode.BleScanError));
      }, ms);
    }
  });
