import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TransportType } from '../utils/hardwareInstance';

// 所有持久化数据的类型定义
export interface PersistenceState {
  // 传输设置
  transport: {
    preferredType: TransportType;
    lastUsed: string | null;
  };

  // 主题设置
  theme: {
    preference: 'light' | 'dark' | 'system';
    lastToggled: string | null;
  };

  // 用户界面偏好
  ui: {
    sidebarCollapsed: boolean;
    showAdvancedOptions: boolean;
    compactMode: boolean;
    language: string;
  };

  // 开发者设置
  developer: {
    debugMode: boolean;
    logLevel: string;
    showInternalLogs: boolean;
  };

  // 用户偏好
  preferences: {
    autoConnect: boolean;
    rememberDevices: boolean;
    confirmations: boolean;
  };

  // Actions
  setTransportPreference: (type: TransportType) => void;
  getTransportPreference: () => TransportType;

  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  getThemePreference: () => 'light' | 'dark' | 'system';

  setUIPreference: <K extends keyof PersistenceState['ui']>(
    key: K,
    value: PersistenceState['ui'][K]
  ) => void;

  setDeveloperPreference: <K extends keyof PersistenceState['developer']>(
    key: K,
    value: PersistenceState['developer'][K]
  ) => void;

  setUserPreference: <K extends keyof PersistenceState['preferences']>(
    key: K,
    value: PersistenceState['preferences'][K]
  ) => void;

  // 批量操作
  resetAllPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => boolean;
}

// 默认状态
const defaultState = {
  transport: {
    preferredType: 'webusb' as TransportType,
    lastUsed: null,
  },
  theme: {
    preference: 'system' as const,
    lastToggled: null,
  },
  ui: {
    sidebarCollapsed: false,
    showAdvancedOptions: false,
    compactMode: false,
    language: 'en',
  },
  developer: {
    debugMode: false,
    logLevel: 'info',
    showInternalLogs: false,
  },
  preferences: {
    autoConnect: false,
    rememberDevices: true,
    confirmations: true,
  },
};

// 创建持久化存储
export const usePersistenceStore = create<PersistenceState>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...defaultState,

      // Transport 相关方法
      setTransportPreference: (type: TransportType) => {
        set(state => ({
          transport: {
            ...state.transport,
            preferredType: type,
            lastUsed: new Date().toISOString(),
          },
        }));
      },

      getTransportPreference: () => {
        return get().transport.preferredType;
      },

      // Theme 相关方法
      setThemePreference: (theme: 'light' | 'dark' | 'system') => {
        set(state => ({
          theme: {
            ...state.theme,
            preference: theme,
            lastToggled: new Date().toISOString(),
          },
        }));
      },

      getThemePreference: () => {
        return get().theme.preference;
      },

      // UI 偏好设置
      setUIPreference: (key, value) => {
        set(state => ({
          ui: {
            ...state.ui,
            [key]: value,
          },
        }));
      },

      // 开发者偏好设置
      setDeveloperPreference: (key, value) => {
        set(state => ({
          developer: {
            ...state.developer,
            [key]: value,
          },
        }));
      },

      // 用户偏好设置
      setUserPreference: (key, value) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },

      // 重置所有偏好
      resetAllPreferences: () => {
        set(defaultState);
      },

      // 导出偏好设置
      exportPreferences: () => {
        const state = get();
        const exportData = {
          transport: state.transport,
          theme: state.theme,
          ui: state.ui,
          developer: state.developer,
          preferences: state.preferences,
          exportTime: new Date().toISOString(),
          version: '1.0.0',
        };
        return JSON.stringify(exportData, null, 2);
      },

      // 导入偏好设置
      importPreferences: (data: string) => {
        try {
          const importData = JSON.parse(data);

          // 验证数据结构
          if (!importData || typeof importData !== 'object') {
            return false;
          }

          // 合并导入的数据
          set(state => ({
            transport: { ...state.transport, ...(importData.transport || {}) },
            theme: { ...state.theme, ...(importData.theme || {}) },
            ui: { ...state.ui, ...(importData.ui || {}) },
            developer: { ...state.developer, ...(importData.developer || {}) },
            preferences: { ...state.preferences, ...(importData.preferences || {}) },
          }));

          return true;
        } catch (error) {
          console.error('Failed to import preferences:', error);
          return false;
        }
      },
    }),
    {
      name: 'onekey-persistence-store',
      version: 1,

      // 使用统一的存储配置
      storage: createJSONStorage(() => localStorage),

      // 持久化所有状态
      partialize: state => ({
        transport: state.transport,
        theme: state.theme,
        ui: state.ui,
        developer: state.developer,
        preferences: state.preferences,
      }),

      // 水合完成后的回调
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('Persistence store rehydration failed:', error);
          } else if (state) {
            console.log('✅ Persistence store rehydrated successfully');
          }
        };
      },
    }
  )
);

// 便捷的 hooks
export const useTransportPersistence = () => {
  const transportState = usePersistenceStore(state => state.transport);
  const setTransportPreference = usePersistenceStore(state => state.setTransportPreference);
  const getTransportPreference = usePersistenceStore(state => state.getTransportPreference);

  return {
    transportState,
    preferredType: transportState.preferredType,
    setTransportPreference,
    getTransportPreference,
  };
};

export const useThemePersistence = () => {
  const themeState = usePersistenceStore(state => state.theme);
  const setThemePreference = usePersistenceStore(state => state.setThemePreference);
  const getThemePreference = usePersistenceStore(state => state.getThemePreference);

  return {
    themeState,
    preference: themeState.preference,
    setThemePreference,
    getThemePreference,
  };
};

export const useUIPersistence = () => {
  const uiState = usePersistenceStore(state => state.ui);
  const setUIPreference = usePersistenceStore(state => state.setUIPreference);

  return {
    uiState,
    setUIPreference,
    // 便捷方法
    setSidebarCollapsed: (collapsed: boolean) => setUIPreference('sidebarCollapsed', collapsed),
    setShowAdvancedOptions: (show: boolean) => setUIPreference('showAdvancedOptions', show),
    setCompactMode: (compact: boolean) => setUIPreference('compactMode', compact),
    setLanguage: (language: string) => setUIPreference('language', language),
  };
};

export const useDeveloperPersistence = () => {
  const developerState = usePersistenceStore(state => state.developer);
  const setDeveloperPreference = usePersistenceStore(state => state.setDeveloperPreference);

  return {
    developerState,
    setDeveloperPreference,
    // 便捷方法
    setDebugMode: (enabled: boolean) => setDeveloperPreference('debugMode', enabled),
    setLogLevel: (level: string) => setDeveloperPreference('logLevel', level),
    setShowInternalLogs: (show: boolean) => setDeveloperPreference('showInternalLogs', show),
  };
};

export const useUserPreferences = () => {
  const preferencesState = usePersistenceStore(state => state.preferences);
  const setUserPreference = usePersistenceStore(state => state.setUserPreference);

  return {
    preferencesState,
    setUserPreference,
    // 便捷方法
    setAutoConnect: (enabled: boolean) => setUserPreference('autoConnect', enabled),
    setRememberDevices: (enabled: boolean) => setUserPreference('rememberDevices', enabled),
    setConfirmations: (enabled: boolean) => setUserPreference('confirmations', enabled),
  };
};

// 全局偏好管理 hook
export const usePreferencesManager = () => {
  const resetAllPreferences = usePersistenceStore(state => state.resetAllPreferences);
  const exportPreferences = usePersistenceStore(state => state.exportPreferences);
  const importPreferences = usePersistenceStore(state => state.importPreferences);

  return {
    resetAllPreferences,
    exportPreferences,
    importPreferences,
  };
};
