import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { BlePlxManager } from './types';
import timer from './utils/timer';

export const subscribeBleOn = (bleManager: BlePlxManager, ms = 1000): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;

    const subscription = bleManager.onStateChange(state => {
      console.log('ble state -> ', state);

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
