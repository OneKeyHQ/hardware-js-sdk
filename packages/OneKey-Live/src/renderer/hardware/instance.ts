import memoizee from 'memoizee';
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import { getSDKVersion } from '@onekeyfe/hd-core';
import type { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';

let initialized = false;

export const getHardwareSDKInstance = memoizee(
  async () =>
    new Promise<CoreApi>(async (resolve, reject) => {
      if (initialized) {
        resolve(HardwareSDK);
        return;
      }
      const settings: Partial<ConnectSettings> = {
        debug: true,
      };

      try {
        await HardwareSDK.init(settings);
        console.log('HardwareSDK initialized success, version: ', getSDKVersion());
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
