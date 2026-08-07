import memoizee from 'memoizee';
import { Platform } from 'react-native';

import { importSdk } from './importSdk';

import type { ConnectSettings, LowLevelCoreApi, TestApi } from '@onekeyfe/hd-core';

type ElectronRendererWindow = Window & {
  desktopApi?: {
    nobleBle?: unknown;
  };
};

export const isElectronBleRuntime = (): boolean =>
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  Boolean((window as ElectronRendererWindow).desktopApi?.nobleBle);

// eslint-disable-next-line import/no-mutable-exports
let HardwareSDK: TestApi | undefined;
let initialized = false;

export const getHardwareSDKInstance = memoizee(
  async (): Promise<{
    HardwareSDK: TestApi;
    HardwareLowLevelSDK: LowLevelCoreApi | undefined;
    useLowLevelApi: false;
  }> => {
    if (initialized && HardwareSDK) {
      return { HardwareSDK, HardwareLowLevelSDK: undefined, useLowLevelApi: false };
    }

    const settings: Partial<ConnectSettings> = {
      debug: true,
      fetchConfig: true,
    };

    if (Platform.OS === 'web') {
      settings.env = isElectronBleRuntime() ? 'desktop-web-ble' : 'webusb';
      settings.preRelease = true;
    }

    const sdk = await importSdk();
    const initResult = await sdk.init(settings);
    if (initResult === false) {
      throw new Error('HardwareSDK initialization failed');
    }

    HardwareSDK = sdk;
    initialized = true;
    console.log(`[connect-example] HardwareSDK initialized (${settings.env ?? 'react-native'})`);

    return { HardwareSDK, HardwareLowLevelSDK: undefined, useLowLevelApi: false };
  },
  {
    promise: true,
    max: 1,
  }
);

export { HardwareSDK };
