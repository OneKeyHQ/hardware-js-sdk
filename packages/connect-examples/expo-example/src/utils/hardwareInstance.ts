import memoizee from 'memoizee';
import { Platform } from 'react-native';
import type { ConnectSettings, CoreApi, LowLevelCoreApi } from '@onekeyfe/hd-core';
import { importLowLevelSDK, importSdk } from './importSdk';

// eslint-disable-next-line import/no-mutable-exports
let HardwareSDK: CoreApi;
let HardwareLowLevelSDK: LowLevelCoreApi;
let initialized = false;
const isNodeEnvironments = false;

export const getHardwareSDKInstance = memoizee(
  async () =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise<{ HardwareSDK: CoreApi; HardwareLowLevelSDK: LowLevelCoreApi }>(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        if (initialized) {
          resolve({ HardwareSDK, HardwareLowLevelSDK });
          return;
        }

        const settings: Partial<ConnectSettings> = {
          debug: true,
        };

        HardwareSDK = await importSdk();

        if (Platform.OS === 'web') {
          settings.connectSrc = 'https://localhost:8087/';
          settings.env = 'web';
          HardwareLowLevelSDK = await importLowLevelSDK();
        }

        try {
          await HardwareSDK.init(settings, HardwareLowLevelSDK);
          console.log('HardwareSDK initialized success');
          initialized = true;

          resolve({ HardwareSDK, HardwareLowLevelSDK });
        } catch (e) {
          reject(e);
        }
      }
    ),
  {
    promise: true,
    max: 1,
  }
);

export { HardwareSDK };
