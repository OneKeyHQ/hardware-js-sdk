import memoizee from 'memoizee';
import { Platform } from 'react-native';

import { importSdk } from './importSdk';
import { getItem, setItem } from './storeUtil';

import type { ConnectSettings, CoreApi, LowLevelCoreApi } from '@onekeyfe/hd-core';

export type ConnectionType = 'webusb' | 'desktop-web-ble';

type ElectronRendererWindow = Window & {
  desktopApi?: {
    nobleBle?: unknown;
    restart?: () => void;
  };
};

const CONNECTION_TYPE_STORE_KEY = '@onekey/connectionType';

const isConnectionType = (value: string | null): value is ConnectionType =>
  value === 'webusb' || value === 'desktop-web-ble';

export const isElectronBleRuntime = (): boolean =>
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  Boolean((window as ElectronRendererWindow).desktopApi?.nobleBle);

const getDefaultConnectionType = (): ConnectionType =>
  isElectronBleRuntime() ? 'desktop-web-ble' : 'webusb';

export const getStoredConnectionType = async (): Promise<ConnectionType> => {
  try {
    const storedConnectionType = await getItem(CONNECTION_TYPE_STORE_KEY);
    if (!isConnectionType(storedConnectionType)) return getDefaultConnectionType();
    if (storedConnectionType === 'desktop-web-ble' && !isElectronBleRuntime()) {
      return getDefaultConnectionType();
    }
    return storedConnectionType;
  } catch (error) {
    console.warn('Failed to read the stored connection type:', error);
    return getDefaultConnectionType();
  }
};

export const storeConnectionType = (connectionType: ConnectionType): Promise<void> =>
  setItem(CONNECTION_TYPE_STORE_KEY, connectionType);

export const restartForConnectionTypeChange = (): void => {
  if (typeof window === 'undefined') return;

  const desktopWindow = window as ElectronRendererWindow;
  if (desktopWindow.desktopApi?.restart) {
    desktopWindow.desktopApi.restart();
    return;
  }
  window.location.reload();
};

// eslint-disable-next-line import/no-mutable-exports
let HardwareSDK: CoreApi | undefined;
let initialized = false;
let activeConnectionType: ConnectionType | undefined;

export const getHardwareSDKInstance = memoizee(
  async (): Promise<{
    HardwareSDK: CoreApi;
    HardwareLowLevelSDK: LowLevelCoreApi | undefined;
    useLowLevelApi: false;
    connectionType: ConnectionType | undefined;
  }> => {
    if (initialized && HardwareSDK) {
      return {
        HardwareSDK,
        HardwareLowLevelSDK: undefined,
        useLowLevelApi: false,
        connectionType: activeConnectionType,
      };
    }

    const settings: Partial<ConnectSettings> = {
      debug: true,
      fetchConfig: true,
    };

    if (Platform.OS === 'web') {
      activeConnectionType = await getStoredConnectionType();
      settings.env = activeConnectionType;
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

    return {
      HardwareSDK,
      HardwareLowLevelSDK: undefined,
      useLowLevelApi: false,
      connectionType: activeConnectionType,
    };
  },
  {
    promise: true,
    max: 1,
  }
);

export { HardwareSDK };
