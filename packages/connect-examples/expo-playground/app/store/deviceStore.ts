import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import LZString from 'lz-string';
import { DeviceInfo } from '../types/hardware';
import type { UnifiedLogEntry } from '../components/common/UnifiedLogger';

import { isClassicModelDevice, isTouchModelDevice } from '../utils/deviceTypeUtils';
import { summarizeJsonValue } from '../utils/jsonPreview';
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
  type: UnifiedLogEntry['type'];
  title?: string;
  message?: string;
  content?: string; // 压缩后的JSON字符串
  data?: string; // 压缩后的JSON字符串 (兼容性)
  compressed?: boolean;
  transient?: boolean;
}

// 持久化日志存储结构
export interface PersistedLogStorage {
  logs: CompressedLogEntry[];
  config: LogStorageConfig;
  lastCleanup: string;
  version: number;
}

interface DeviceState {
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

  // Logs management
  logs: UnifiedLogEntry[];

  // Log management
  addLog: (log: UnifiedLogEntry) => void;
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

const MAX_TRANSIENT_LOG_ENTRIES = 300;

let lastPersistedDeviceStoreValue: string | null = null;

const getSafePersistedLogData = (data: Record<string, unknown> | null) => {
  if (!data) return null;
  const summarized = summarizeJsonValue(data, {
    maxDepth: 6,
    maxArrayItems: 20,
    maxObjectKeys: 60,
    maxStringLength: 512,
  });
  return summarized && typeof summarized === 'object' && !Array.isArray(summarized)
    ? (summarized as Record<string, unknown>)
    : { value: summarized };
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
const filterUIEventData = (log: UnifiedLogEntry): UnifiedLogEntry => {
  // 检查是否为UI事件（通常消息包含"UI事件"或以"ui-"开头）
  const message = log.message || log.title || '';
  const logData = log.data || (typeof log.content === 'object' ? log.content : null);

  const isUIEvent =
    message.includes('UI事件') ||
    message.includes('ui-') ||
    (logData &&
      typeof logData === 'object' &&
      Object.keys(logData).some(key => key.startsWith('ui-')));

  if (!isUIEvent || !logData || typeof logData !== 'object') {
    return log;
  }

  // 创建过滤后的数据副本，移除device字段
  const filteredData = { ...logData };
  if ('device' in filteredData) {
    delete filteredData.device;
  }

  return {
    ...log,
    data: filteredData,
    content: filteredData,
  };
};

// 转换UnifiedLogEntry到CompressedLogEntry
const compressLogEntry = (log: UnifiedLogEntry, config: LogStorageConfig): CompressedLogEntry => {
  // 先过滤UI事件数据
  const filteredLog = filterUIEventData(log);
  const logData = getSafePersistedLogData(
    filteredLog.data || (typeof filteredLog.content === 'object' ? filteredLog.content : null)
  );

  if (!config.compressionEnabled || !logData) {
    return {
      id: filteredLog.id,
      timestamp:
        typeof filteredLog.timestamp === 'string'
          ? filteredLog.timestamp
          : filteredLog.timestamp.toISOString(),
      type: filteredLog.type,
      title: filteredLog.title,
      message: filteredLog.message,
      content: logData ? JSON.stringify(logData) : undefined,
      data: logData ? JSON.stringify(logData) : undefined,
      compressed: false,
      transient: filteredLog.transient,
    };
  }

  const originalData = JSON.stringify(logData);
  const compressedData = compressData(logData);

  // 判断是否真正被压缩了（LZ-string压缩 vs 原始JSON）
  const wasCompressed = compressedData !== originalData;

  return {
    id: filteredLog.id,
    timestamp:
      typeof filteredLog.timestamp === 'string'
        ? filteredLog.timestamp
        : filteredLog.timestamp.toISOString(),
    type: filteredLog.type,
    title: filteredLog.title,
    message: filteredLog.message,
    content: compressedData,
    data: compressedData,
    compressed: wasCompressed,
    transient: filteredLog.transient,
  };
};

// 转换CompressedLogEntry到UnifiedLogEntry
const decompressLogEntry = (compressed: CompressedLogEntry): UnifiedLogEntry => {
  const data = compressed.data || compressed.content;
  const decompressedData = data ? decompressData(data) : undefined;

  return {
    id: compressed.id,
    timestamp: compressed.timestamp,
    type: compressed.type,
    title: compressed.title || compressed.message,
    message: compressed.message,
    content: decompressedData || null,
    data: decompressedData,
    ...(compressed.transient ? { transient: true } : {}),
  };
};

const trimTransientLogs = (logs: UnifiedLogEntry[]): UnifiedLogEntry[] => {
  let transientCount = logs.reduce((count, log) => count + (log.transient ? 1 : 0), 0);
  if (transientCount <= MAX_TRANSIENT_LOG_ENTRIES) {
    return logs;
  }

  return logs.filter(log => {
    if (!log.transient || transientCount <= MAX_TRANSIENT_LOG_ENTRIES) {
      return true;
    }
    transientCount -= 1;
    return false;
  });
};

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      // Default state
      connectedDevices: [],
      currentDevice: null,
      deviceFeatures: undefined,
      isConnecting: false,
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
      setConnectedDevices: (devices: DeviceInfo[]) => set({ connectedDevices: devices }),
      setCurrentDevice: (device: DeviceInfo | null) => set({ currentDevice: device }),
      setDeviceFeatures: (features: Features | undefined) => set({ deviceFeatures: features }),
      setIsConnecting: (isConnecting: boolean) => set({ isConnecting }),

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

      addLog: (log: UnifiedLogEntry) =>
        set(state => {
          const newLogs = trimTransientLogs([...state.logs, log]);
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
        const sortedLogs = [...logs].sort((a, b) => {
          const timeA =
            typeof a.timestamp === 'string'
              ? new Date(a.timestamp).getTime()
              : a.timestamp.getTime();
          const timeB =
            typeof b.timestamp === 'string'
              ? new Date(b.timestamp).getTime()
              : b.timestamp.getTime();
          return timeA - timeB;
        });

        const oldestTimestamp = sortedLogs[0]?.timestamp;
        const newestTimestamp = sortedLogs[sortedLogs.length - 1]?.timestamp;

        return {
          totalEntries: logs.length,
          totalSizeBytes,
          oldestEntry:
            typeof oldestTimestamp === 'string' ? oldestTimestamp : oldestTimestamp?.toISOString(),
          newestEntry:
            typeof newestTimestamp === 'string' ? newestTimestamp : newestTimestamp?.toISOString(),
        };
      },

      cleanupExpiredLogs: () => {
        set(state => {
          const now = new Date();
          const expirationTime =
            now.getTime() - state.logStorageConfig.expirationDays * 24 * 60 * 60 * 1000;

          const cleanedLogs = state.logs.filter(log => {
            const logTime =
              typeof log.timestamp === 'string'
                ? new Date(log.timestamp).getTime()
                : log.timestamp.getTime();
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
            .map(log => {
              const timestamp =
                typeof log.timestamp === 'string' ? log.timestamp : log.timestamp.toISOString();
              const message = log.message || log.title || '';
              const data = getSafePersistedLogData(
                log.data || (typeof log.content === 'object' ? log.content : null)
              );
              return `[${timestamp}] ${log.type.toUpperCase()}: ${message}${
                data ? '\nData: ' + JSON.stringify(data, null, 2) : ''
              }`;
            })
            .join('\n\n');
        }

        return JSON.stringify(
          logs.map(log => ({
            ...log,
            data: getSafePersistedLogData(
              log.data || (typeof log.content === 'object' ? log.content : null)
            ),
            content: getSafePersistedLogData(
              log.data || (typeof log.content === 'object' ? log.content : null)
            ),
          })),
          null,
          2
        );
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
        logs: state.logs
          .filter(log => !log.transient)
          .map(log => compressLogEntry(log, state.logStorageConfig)),
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

            const serialized = JSON.stringify(parsed);
            lastPersistedDeviceStoreValue = serialized;
            return serialized;
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

            const serialized = JSON.stringify(parsed);
            if (serialized === lastPersistedDeviceStoreValue) {
              return;
            }
            localStorage.setItem(name, serialized);
            lastPersistedDeviceStoreValue = serialized;
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
