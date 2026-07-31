import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import timer from './utils/timer';

import type { BlePlxManager } from './types';

export const subscribeBleOn = (bleManager: BlePlxManager, ms = 1000): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;

    const subscription = bleManager.onStateChange(state => {
      if (state === 'PoweredOn') {
        if (done) return;
        clearTimeout();
        done = true;
        subscription.remove();
        resolve();
      }
    }, true);

    const clearTimeout = timer.timeout(() => {
      if (done) return;
      subscription.remove();
      reject(ERRORS.TypedError(HardwareErrorCode.BlePermissionError));
    }, ms);
  });
