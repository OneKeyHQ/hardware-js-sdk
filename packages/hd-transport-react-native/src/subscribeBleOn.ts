import { BleManager } from './types';
import timer from './utils/timer';

export const subscribeBleOn = (bleManager: BleManager, ms = 3000): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;
    let lastState = 'Unknown';

    const subscription = bleManager.onStateChange(state => {
      lastState = state;

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
      reject(new Error(`Bluetooth required to be turned ${lastState}`));
    }, ms);
  });
