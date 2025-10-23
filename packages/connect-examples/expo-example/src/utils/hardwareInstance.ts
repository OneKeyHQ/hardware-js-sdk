import memoizee from 'memoizee';
import { Platform } from 'react-native';
import { ConnectSettings, CoreApi, LowLevelCoreApi } from '@onekeyfe/hd-core';
import { importSdk, importLowLevelSDK } from './importSdk';
import { CONNECT_SRC } from '../constants/connect';
import { getItem } from './storeUtil';
import type { ConnectionType } from '../atoms/deviceConnectAtoms';

// eslint-disable-next-line import/no-mutable-exports
let HardwareSDK: CoreApi;
let HardwareLowLevelSDK: LowLevelCoreApi;
let initialized = false;

const CONNECTION_TYPE_STORE_KEY = '@onekey/connectionType';

/**
 * Determine if the connection type should use hd-common-connect-sdk
 */
const shouldUseCommonSdk = (connectionType: ConnectionType | null): boolean =>
  connectionType === 'desktop-web-ble' || connectionType === 'webusb';

/**
 * Map connection type to SDK env parameter
 */
const getSDKEnv = (
  connectionType: ConnectionType | null
): 'webusb' | 'emulator' | 'desktop-web-ble' | 'web' => {
  switch (connectionType) {
    case 'desktop-web-ble':
      return 'desktop-web-ble';
    case 'webusb':
      return 'webusb';
    case 'emulator':
      return 'emulator';
    case 'bridge':
    default:
      return 'web';
  }
};

const getStoredConnectionType = async (): Promise<ConnectionType | null> => {
  try {
    const value = await getItem(CONNECTION_TYPE_STORE_KEY);
    return value as ConnectionType | null;
  } catch (error) {
    console.log('Error getting stored connection type:', error);
    return null;
  }
};

export const getHardwareSDKInstance = memoizee(
  async () =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise<{
      HardwareSDK: CoreApi;
      HardwareLowLevelSDK: LowLevelCoreApi;
      useLowLevelApi: boolean;
    }>(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        const useLowLevelApi = false;
        if (initialized) {
          resolve({ HardwareSDK, HardwareLowLevelSDK, useLowLevelApi });
          return;
        }

        const settings: Partial<ConnectSettings> = {
          debug: true,
          fetchConfig: true,
        };

        // Get stored connection type to determine SDK type and transport
        const storedConnectionType = await getStoredConnectionType();
        const useCommonSdk = shouldUseCommonSdk(storedConnectionType);

        console.log('SDK Configuration: =====> ', {
          connectionType: storedConnectionType,
          useCommonSdk,
          sdkEnv: getSDKEnv(storedConnectionType),
        });

        HardwareSDK = await importSdk({
          useCommonSdk,
        });
        console.log(HardwareSDK);

        if (Platform.OS === 'web') {
          settings.connectSrc = CONNECT_SRC;
          settings.env = getSDKEnv(storedConnectionType);
          settings.preRelease = true;
          HardwareLowLevelSDK = await importLowLevelSDK();

          // Override Connect src
          // @ts-expect-error
          const { sdkConnectSrc } = window.ONEKEY_DESKTOP_GLOBALS ?? {};
          if (sdkConnectSrc) {
            settings.connectSrc = sdkConnectSrc;
          }
        }

        try {
          await HardwareSDK.init(settings);
          // await HardwareSDK.init(settings, HardwareLowLevelSDK);
          console.log('HardwareSDK initialized success');
          initialized = true;

          resolve({ HardwareSDK, HardwareLowLevelSDK, useLowLevelApi });
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
