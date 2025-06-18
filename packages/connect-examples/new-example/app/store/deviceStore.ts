import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import LZString from 'lz-string';
import { DeviceInfo, LogEntry, ApiResponse } from '../types/hardware';
import { TransportType } from '../services/hardwareService';
import { isClassicModelDevice, isTouchModelDevice } from '../utils/deviceTypeUtils';
import type { IDeviceType, Features } from '@onekeyfe/hd-core';
import {
  UiEvent,
  getDeviceFirmwareVersion,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceLabel,
  getDeviceUUID,
} from '@onekeyfe/hd-core';

// 设备动作状态
export interface DeviceActionState {
  isActive: boolean;
  actionType: UiEvent['type'] | null;
  deviceInfo?: Record<string, unknown>;
  startTime?: number;
}

// SDK初始化状态
export interface SDKInitializationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  lastInitTime?: number;
}

// 日志存储配置
export interface LogStorageConfig {
  maxEntries: number; // 最大日志条数
  maxSizeBytes: number; // 最大存储大小（字节）
  expirationDays: number; // 日志过期天数
  compressionEnabled: boolean; // 是否启用压缩
}

// 压缩后的日志条目
export interface CompressedLogEntry {
  id: string;
  timestamp: string;
  type: LogEntry['type'];
  message: string;
  data?: string; // 压缩后的JSON字符串
  compressed?: boolean;
}

// 持久化日志存储结构
export interface PersistedLogStorage {
  logs: CompressedLogEntry[];
  config: LogStorageConfig;
  lastCleanup: string;
  version: number;
}

interface DeviceState {
  // Connection types
  connectionType: string;
  transportType: TransportType;
  setConnectionType: (type: string) => void;
  setTransportType: (type: TransportType) => void;

  // SDK initialization state
  sdkInitState: SDKInitializationState;
  setSdkInitState: (state: Partial<SDKInitializationState>) => void;
  updateSdkInitState: (updates: Partial<SDKInitializationState>) => void;

  // Device management
  connectedDevices: DeviceInfo[];
  currentDevice: DeviceInfo | null;
  deviceFeatures: Features | undefined;
  isConnecting: boolean;

  // Device action state for lottie animations
  deviceAction: DeviceActionState;
  setDeviceAction: (action: DeviceActionState) => void;
  clearDeviceAction: () => void;

  // Actions
  setConnectedDevices: (devices: DeviceInfo[]) => void;
  setCurrentDevice: (device: DeviceInfo | null) => void;
  setDeviceFeatures: (features: Features | undefined) => void;
  setIsConnecting: (isConnecting: boolean) => void;

  // Response and logs
  lastResponse: ApiResponse | null;
  logs: LogEntry[];

  // Response and log management
  setLastResponse: (response: ApiResponse | null) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // 新增：日志存储管理
  logStorageConfig: LogStorageConfig;
  setLogStorageConfig: (config: Partial<LogStorageConfig>) => void;
  getLogStorageStats: () => {
    totalEntries: number;
    totalSizeBytes: number;
    oldestEntry?: string;
    newestEntry?: string;
  };
  cleanupExpiredLogs: () => void;
  exportLogs: (format?: 'json' | 'text') => string;

  // Device type helpers
  getCurrentDeviceType: () => IDeviceType | null;
  isCurrentDeviceClassicModel: () => boolean;
  isCurrentDeviceTouchModel: () => boolean;
  getCurrentDeviceFirmwareVersion: () => [number, number, number] | null;
  getCurrentDeviceBLEVersion: () => [number, number, number] | null;
  getCurrentDeviceBootloaderVersion: () => [number, number, number] | null;
  getCurrentDeviceLabel: () => string | null;
  getCurrentDeviceUUID: () => string | null;
}

// 默认日志存储配置
const DEFAULT_LOG_CONFIG: LogStorageConfig = {
  maxEntries: 5000, // 最多5000条日志
  maxSizeBytes: 30 * 1024 * 1024, // 最大30MB
  expirationDays: 2, // 2天过期
  compressionEnabled: true, // 启用压缩
};

// 智能压缩函数 - 使用LZ-string进行真正的压缩
const compressData = (data: Record<string, unknown>): string => {
  try {
    const jsonString = JSON.stringify(data);

    // 小于1KB的数据不压缩，直接返回JSON字符串
    if (jsonString.length < 1024) {
      return jsonString;
    }

    // 使用LZ-string压缩
    const compressed = LZString.compressToUTF16(jsonString);

    // 如果压缩效果不好（压缩率<20%），返回原始数据
    if (compressed.length >= jsonString.length * 0.8) {
      return jsonString;
    }

    return compressed;
  } catch {
    return '{}';
  }
};

const decompressData = (compressed: string): Record<string, unknown> => {
  try {
    // 尝试LZ-string解压
    const decompressed = LZString.decompressFromUTF16(compressed);
    if (decompressed) {
      return JSON.parse(decompressed);
    }

    // 如果解压失败，尝试直接JSON解析（可能是未压缩的数据）
    return JSON.parse(compressed);
  } catch {
    return {};
  }
};

// 计算字符串字节大小
const getStringByteSize = (str: string): number => {
  return new Blob([str]).size;
};

// 日志清理函数
const cleanupLogs = (
  logs: CompressedLogEntry[],
  config: LogStorageConfig
): CompressedLogEntry[] => {
  const now = new Date();
  const expirationTime = now.getTime() - config.expirationDays * 24 * 60 * 60 * 1000;

  // 1. 移除过期日志
  let cleanedLogs = logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > expirationTime;
  });

  // 2. 限制条数
  if (cleanedLogs.length > config.maxEntries) {
    cleanedLogs = cleanedLogs.slice(-config.maxEntries);
  }

  // 3. 检查大小限制
  let totalSize = getStringByteSize(JSON.stringify(cleanedLogs));
  while (totalSize > config.maxSizeBytes && cleanedLogs.length > 0) {
    cleanedLogs.shift(); // 移除最旧的日志
    totalSize = getStringByteSize(JSON.stringify(cleanedLogs));
  }

  return cleanedLogs;
};

// 过滤UI事件中的device字段，不然数据量太大了。
const filterUIEventData = (log: LogEntry): LogEntry => {
  // 检查是否为UI事件（通常消息包含"UI事件"或以"ui-"开头）
  const isUIEvent =
    log.message.includes('UI事件') ||
    log.message.includes('ui-') ||
    (log.data &&
      typeof log.data === 'object' &&
      Object.keys(log.data).some(key => key.startsWith('ui-')));

  if (!isUIEvent || !log.data || typeof log.data !== 'object') {
    return log;
  }

  // 创建过滤后的数据副本，移除device字段
  const filteredData = { ...log.data };
  if ('device' in filteredData) {
    delete filteredData.device;
  }

  return {
    ...log,
    data: filteredData,
  };
};

// 转换LogEntry到CompressedLogEntry
const compressLogEntry = (log: LogEntry, config: LogStorageConfig): CompressedLogEntry => {
  // 先过滤UI事件数据
  const filteredLog = filterUIEventData(log);

  if (!config.compressionEnabled || !filteredLog.data) {
    return {
      id: filteredLog.id,
      timestamp: filteredLog.timestamp,
      type: filteredLog.type,
      message: filteredLog.message,
      data: filteredLog.data ? JSON.stringify(filteredLog.data) : undefined,
      compressed: false,
    };
  }

  const originalData = JSON.stringify(filteredLog.data);
  const compressedData = compressData(filteredLog.data);

  // 判断是否真正被压缩了（LZ-string压缩 vs 原始JSON）
  const wasCompressed = compressedData !== originalData;

  return {
    id: filteredLog.id,
    timestamp: filteredLog.timestamp,
    type: filteredLog.type,
    message: filteredLog.message,
    data: compressedData,
    compressed: wasCompressed,
  };
};

// 转换CompressedLogEntry到LogEntry
const decompressLogEntry = (compressed: CompressedLogEntry): LogEntry => {
  return {
    id: compressed.id,
    timestamp: compressed.timestamp,
    type: compressed.type,
    message: compressed.message,
    data: compressed.data ? decompressData(compressed.data) : undefined,
  };
};

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      // Default state
      connectionType: 'WebUSB',
      transportType: 'webusb',
      connectedDevices: [],
      currentDevice: null,
      deviceFeatures: undefined,
      isConnecting: false,
      lastResponse: null,
      logs: [],
      deviceAction: {
        isActive: false,
        actionType: null,
      },
      sdkInitState: {
        isInitialized: false,
        isInitializing: false,
        error: null,
      },
      logStorageConfig: DEFAULT_LOG_CONFIG,

      // Actions
      setConnectionType: (type: string) => set({ connectionType: type }),
      setTransportType: (type: TransportType) => set({ transportType: type }),
      setConnectedDevices: (devices: DeviceInfo[]) => set({ connectedDevices: devices }),
      setCurrentDevice: (device: DeviceInfo | null) => set({ currentDevice: device }),
      setDeviceFeatures: (features: Features | undefined) => set({ deviceFeatures: features }),
      setIsConnecting: (isConnecting: boolean) => set({ isConnecting }),
      setLastResponse: (response: ApiResponse | null) => set({ lastResponse: response }),

      // SDK initialization management
      setSdkInitState: (state: Partial<SDKInitializationState>) =>
        set(prevState => ({
          sdkInitState: { ...prevState.sdkInitState, ...state },
        })),

      updateSdkInitState: (updates: Partial<SDKInitializationState>) =>
        set(prevState => ({
          sdkInitState: { ...prevState.sdkInitState, ...updates },
        })),

      // Device action management
      setDeviceAction: (action: DeviceActionState) => set({ deviceAction: action }),
      clearDeviceAction: () =>
        set({
          deviceAction: {
            isActive: false,
            actionType: null,
          },
        }),

      addLog: (log: LogEntry) =>
        set(state => {
          const newLogs = [...state.logs, log];
          // 在内存中也进行基本的大小限制
          if (newLogs.length > state.logStorageConfig.maxEntries) {
            return {
              logs: newLogs.slice(-state.logStorageConfig.maxEntries),
            };
          }
          return { logs: newLogs };
        }),

      clearLogs: () => set({ logs: [] }),

      // 新增：日志存储管理方法
      setLogStorageConfig: (config: Partial<LogStorageConfig>) =>
        set(state => ({
          logStorageConfig: { ...state.logStorageConfig, ...config },
        })),

      getLogStorageStats: () => {
        const state = get();
        const logs = state.logs;

        if (logs.length === 0) {
          return {
            totalEntries: 0,
            totalSizeBytes: 0,
          };
        }

        const totalSizeBytes = getStringByteSize(JSON.stringify(logs));
        const sortedLogs = [...logs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return {
          totalEntries: logs.length,
          totalSizeBytes,
          oldestEntry: sortedLogs[0]?.timestamp,
          newestEntry: sortedLogs[sortedLogs.length - 1]?.timestamp,
        };
      },

      cleanupExpiredLogs: () => {
        set(state => {
          const now = new Date();
          const expirationTime =
            now.getTime() - state.logStorageConfig.expirationDays * 24 * 60 * 60 * 1000;

          const cleanedLogs = state.logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime > expirationTime;
          });

          return { logs: cleanedLogs };
        });
      },

      exportLogs: (format: 'json' | 'text' = 'json') => {
        const state = get();
        const logs = state.logs;

        if (format === 'text') {
          return logs
            .map(
              log =>
                `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${
                  log.data ? '\nData: ' + JSON.stringify(log.data, null, 2) : ''
                }`
            )
            .join('\n\n');
        }

        return JSON.stringify(logs, null, 2);
      },

      // Device type helpers
      getCurrentDeviceType: () => {
        const state = get();
        return state.currentDevice?.deviceType || null;
      },
      isCurrentDeviceClassicModel: () => {
        const state = get();
        return isClassicModelDevice(state.currentDevice?.deviceType);
      },
      isCurrentDeviceTouchModel: () => {
        const state = get();
        return isTouchModelDevice(state.currentDevice?.deviceType);
      },
      getCurrentDeviceFirmwareVersion: () => {
        const state = get();
        return getDeviceFirmwareVersion(state.deviceFeatures);
      },
      getCurrentDeviceBLEVersion: () => {
        const state = get();
        return getDeviceBLEFirmwareVersion(state.deviceFeatures as Features);
      },
      getCurrentDeviceBootloaderVersion: () => {
        const state = get();
        return getDeviceBootloaderVersion(state.deviceFeatures);
      },
      getCurrentDeviceLabel: () => {
        const state = get();
        return getDeviceLabel(state.deviceFeatures);
      },
      getCurrentDeviceUUID: () => {
        const state = get();
        return state.deviceFeatures ? getDeviceUUID(state.deviceFeatures) : null;
      },
    }),
    {
      name: 'onekey-device-store',
      version: 12,

      // 只持久化日志和配置，其他状态保持会话级别
      partialize: state => ({
        logs: state.logs.map(log => compressLogEntry(log, state.logStorageConfig)),
        logStorageConfig: state.logStorageConfig,
      }),

      // 自定义存储，添加压缩和清理逻辑
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            if (!item) return null;

            const parsed = JSON.parse(item);
            if (parsed?.state?.logs) {
              // 在读取时进行清理
              const config = parsed.state.logStorageConfig || DEFAULT_LOG_CONFIG;
              parsed.state.logs = cleanupLogs(parsed.state.logs, config);
              parsed.state.lastCleanup = new Date().toISOString();
            }

            return JSON.stringify(parsed);
          } catch (error) {
            console.warn('Failed to read persisted logs:', error);
            // 如果是版本错误，清除存储并返回null以重新初始化
            if (error instanceof Error && error.message.includes('version')) {
              console.warn('Version conflict detected, clearing storage');
              localStorage.removeItem(name);
            }
            return null;
          }
        },

        setItem: (name: string, value: string) => {
          try {
            const parsed = JSON.parse(value);
            if (parsed?.state?.logs) {
              // 在写入时进行清理和压缩
              const config = parsed.state.logStorageConfig || DEFAULT_LOG_CONFIG;
              parsed.state.logs = cleanupLogs(parsed.state.logs, config);
            }

            localStorage.setItem(name, JSON.stringify(parsed));
          } catch (error) {
            console.warn('Failed to persist logs:', error);
          }
        },

        removeItem: (name: string) => {
          localStorage.removeItem(name);
        },
      })),

      // 自定义合并逻辑，将压缩的日志解压
      merge: (persistedState: unknown, currentState: DeviceState) => {
        const merged = { ...currentState };

        // 类型安全检查和处理
        if (persistedState && typeof persistedState === 'object') {
          const state = persistedState as Record<string, unknown>;

          // 处理日志数据
          if ('logs' in state && Array.isArray(state.logs)) {
            try {
              merged.logs = state.logs.map((compressed: unknown) => {
                if (compressed && typeof compressed === 'object') {
                  return decompressLogEntry(compressed as CompressedLogEntry);
                }
                throw new Error('Invalid log entry format');
              });
            } catch (error) {
              console.warn('Failed to decompress logs:', error);
              merged.logs = [];
            }
          }

          // 处理配置数据
          if (
            'logStorageConfig' in state &&
            state.logStorageConfig &&
            typeof state.logStorageConfig === 'object'
          ) {
            merged.logStorageConfig = {
              ...DEFAULT_LOG_CONFIG,
              ...(state.logStorageConfig as Partial<LogStorageConfig>),
            };
          }
        }

        return merged;
      },

      // 水合完成后的回调
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('Log rehydration failed:', error);
          } else if (state) {
            console.log('Logs rehydrated successfully:', {
              totalLogs: state.logs.length,
              config: state.logStorageConfig,
            });

            // 启动时自动清理过期日志
            state.cleanupExpiredLogs();
          }
        };
      },
    }
  )
);
