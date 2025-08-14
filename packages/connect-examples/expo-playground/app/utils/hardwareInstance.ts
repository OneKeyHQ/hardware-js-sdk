import memoizee from 'memoizee';
import { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';
import SDK from '@onekeyfe/hd-web-sdk';
import { CONNECT_SRC } from '../constants/connect';
import { logInfo, logError } from './logger';

const { HardwareWebSdk } = SDK;

let initialized = false;

export type TransportType = 'webusb' | 'jsbridge' | 'emulator';

export interface SDKInitResult {
  HardwareSDK: CoreApi;
  initialized: boolean;
}

// 根据transport类型获取SDK环境配置
function getSDKEnv(transport: TransportType): ConnectSettings['env'] {
  switch (transport) {
    case 'jsbridge':
      return 'web';
    case 'emulator':
      return 'emulator';
    case 'webusb':
    default:
      // 对于WebUSB，使用 'web' 环境配置，这与expo-example保持一致
      return 'web';
  }
}

// 使用memoizee缓存的SDK实例获取函数
export const getHardwareSDKInstance = memoizee(
  async (transport: TransportType = 'webusb'): Promise<SDKInitResult> => {
    try {
      // 如果已经初始化且transport相同，直接返回
      if (initialized) {
        logInfo('SDK already initialized, returning cached instance');
        return { HardwareSDK: HardwareWebSdk, initialized: true };
      }

      logInfo(`Initializing SDK with transport: ${transport}`);

      const settings: Partial<ConnectSettings> = {
        debug: true,
        fetchConfig: true,
        env: getSDKEnv(transport),
        connectSrc: CONNECT_SRC,
      };

      logInfo('SDK initialization settings:', settings as Record<string, unknown>);

      const result = await HardwareWebSdk.init(settings);

      if (result === false) {
        throw new Error('SDK initialization returned false');
      }

      initialized = true;
      logInfo('SDK initialized successfully');

      return { HardwareSDK: HardwareWebSdk, initialized: true };
    } catch (error) {
      // 处理iframe已存在的情况
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as Error).message || '';
        if (
          errorMessage.includes('IFrame alerady initialized') ||
          errorMessage.includes('IFrame already initialized')
        ) {
          logInfo('SDK iframe already exists, using existing instance');
          initialized = true;
          return { HardwareSDK: HardwareWebSdk, initialized: true };
        }
      }

      logError('SDK initialization failed:', { error });
      throw error;
    }
  },
  {
    promise: true,
    max: 1,
    // 根据transport类型进行缓存区分
    normalizer: (args: [TransportType?]) => args[0] || 'webusb',
  }
);

// 清除SDK实例缓存（用于transport切换）
export function clearSDKInstanceCache(): void {
  getHardwareSDKInstance.clear();
  initialized = false;
  logInfo('SDK instance cache cleared');
}

// 检查SDK是否已初始化
export function isSDKInitialized(): boolean {
  return initialized;
}

// 获取SDK实例状态
export function getSDKStatus(): {
  initialized: boolean;
  cacheSize: number;
} {
  return {
    initialized,
    cacheSize: getHardwareSDKInstance.length,
  };
}

// ========== 统一Transport状态管理 ==========

import { usePersistenceStore } from '../store/persistenceStore';

/**
 * 统一的Transport状态管理工具
 * 直接使用persistenceStore管理transport状态
 */
export const TransportManager = {
  // 获取当前transport类型
  getCurrentTransport: (): TransportType => {
    return usePersistenceStore.getState().getTransportPreference();
  },

  // 设置transport类型
  setTransport: (transport: TransportType): void => {
    usePersistenceStore.getState().setTransportPreference(transport);
    logInfo(`Transport updated to: ${transport}`);
  },

  // 初始化transport状态（兼容性函数，实际上persistenceStore会自动处理）
  initializeTransport: (): TransportType => {
    const transport = usePersistenceStore.getState().getTransportPreference();
    logInfo(`Transport initialized to: ${transport}`);
    return transport;
  },

  // 获取transport状态信息
  getTransportInfo: () => {
    const state = usePersistenceStore.getState();
    return {
      currentTransport: state.transport.preferredType,
      lastUsed: state.transport.lastUsed,
    };
  },
};

/**
 * 获取当前SDK实例 - 使用统一的transport管理
 */
export async function getCurrentSDKInstance(): Promise<CoreApi> {
  const currentTransport = TransportManager.getCurrentTransport();
  const { HardwareSDK } = await getHardwareSDKInstance(currentTransport);
  return HardwareSDK;
}

/**
 * SDK工具函数集合 - 替代原来的useSDK和useHardwareAPI hooks
 */
export const SDKUtils = {
  // 获取SDK实例
  getInstance: getCurrentSDKInstance,

  // 初始化SDK（兼容性函数）
  initialize: async (): Promise<void> => {
    await getCurrentSDKInstance();
  },

  // 清除缓存
  clearCache: clearSDKInstanceCache,

  // 获取状态
  getStatus: getSDKStatus,

  // 检查是否已初始化
  isInitialized: isSDKInitialized,

  // Transport管理
  transport: TransportManager,
};
