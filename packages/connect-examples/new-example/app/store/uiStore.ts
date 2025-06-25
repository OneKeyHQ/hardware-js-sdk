import { create } from 'zustand';
import { useUIPersistence, useThemePersistence } from './persistenceStore';

// UI 状态接口 - 现在只包含非持久化的状态
export interface UIState {
  // 临时UI状态（不需要持久化）
  isLoading: boolean;
  currentModal: string | null;
  notifications: Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' }>;

  // Actions
  setIsLoading: (loading: boolean) => void;
  setCurrentModal: (modal: string | null) => void;
  addNotification: (notification: { message: string; type: 'info' | 'warning' | 'error' }) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// 创建 UI 状态存储 - 只存储临时状态
export const useUIStore = create<UIState>()(set => ({
  // 初始状态
  isLoading: false,
  currentModal: null,
  notifications: [],

  // Actions
  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setCurrentModal: (modal: string | null) => {
    set({ currentModal: modal });
  },

  addNotification: notification => {
    const id = Date.now().toString();
    set(state => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
  },

  removeNotification: (id: string) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));

// 导出便捷的 hooks - 现在使用持久化存储
export const useSidebarState = () => {
  const { uiState, setSidebarCollapsed } = useUIPersistence();

  const toggleSidebar = () => {
    setSidebarCollapsed(!uiState.sidebarCollapsed);
  };

  return {
    sidebarCollapsed: uiState.sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };
};

export const useThemePreference = () => {
  const { preference, setThemePreference } = useThemePersistence();

  return {
    themePreference: preference,
    setThemePreference,
  };
};

// 新增：UI偏好设置 hooks
export const useAdvancedOptions = () => {
  const { uiState, setShowAdvancedOptions } = useUIPersistence();

  return {
    showAdvancedOptions: uiState.showAdvancedOptions,
    setShowAdvancedOptions,
  };
};

export const useCompactMode = () => {
  const { uiState, setCompactMode } = useUIPersistence();

  return {
    compactMode: uiState.compactMode,
    setCompactMode,
  };
};

// 通知系统 hooks
export const useNotifications = () => {
  const notifications = useUIStore(state => state.notifications);
  const addNotification = useUIStore(state => state.addNotification);
  const removeNotification = useUIStore(state => state.removeNotification);
  const clearNotifications = useUIStore(state => state.clearNotifications);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
};
