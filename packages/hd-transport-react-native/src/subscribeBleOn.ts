import { PERMISSION_ERROR } from './constants';
import { BlePlxManager } from './types';
import timer from './utils/timer';

export const subscribeBleOn = (bleManager: BlePlxManager, ms = 3000): Promise<void> =>
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
      reject(new Error(PERMISSION_ERROR));
    }, ms);
  });
