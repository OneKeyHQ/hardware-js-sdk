import memoizee from 'memoizee';
import { Platform } from 'react-native';
import type { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';
import { importSdk } from './importSdk';

// eslint-disable-next-line import/no-mutable-exports
let HardwareSDK: CoreApi;
let initialized = false;
const isNodeEnvironments = false;

export const getHardwareSDKInstance = memoizee(
  async () =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise<CoreApi>(async (resolve, reject) => {
      if (initialized) {
        resolve(HardwareSDK);
        return;
      }

      const settings: Partial<ConnectSettings> = {
        debug: true,
      };

      HardwareSDK = await importSdk(isNodeEnvironments);

      if (Platform.OS === 'web') {
        settings.connectSrc = 'https://jssdk.onekey.so/0.2.49/';
        // settings.connectSrc = 'https://localhost:8087/';
        settings.env = 'web';
      }

      try {
        await HardwareSDK.init(settings);
        console.log('HardwareSDK initialized success');
        initialized = true;
        resolve(HardwareSDK);
      } catch (e) {
        reject(e);
      }
    }),
  {
    promise: true,
    max: 1,
  }
);

export { HardwareSDK };
