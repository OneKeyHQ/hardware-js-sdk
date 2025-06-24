import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// UI 状态接口
export interface UIState {
  // 侧边栏状态
  sidebarCollapsed: boolean;

  // 主题相关
  themePreference: 'light' | 'dark' | 'system';

  // 用户界面偏好
  showAdvancedOptions: boolean;
  compactMode: boolean;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  setShowAdvancedOptions: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;

  // 重置所有设置
  resetUISettings: () => void;
}

// 默认状态
const defaultUIState = {
  sidebarCollapsed: false,
  themePreference: 'system' as const,
  showAdvancedOptions: false,
  compactMode: false,
};

// 创建 UI 状态存储
export const useUIStore = create<UIState>()(
  persist(
    set => ({
      // 初始状态
      ...defaultUIState,

      // 侧边栏操作
      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      // 主题操作
      setThemePreference: (theme: 'light' | 'dark' | 'system') => {
        set({ themePreference: theme });
      },

      // 界面偏好操作
      setShowAdvancedOptions: (show: boolean) => {
        set({ showAdvancedOptions: show });
      },

      setCompactMode: (compact: boolean) => {
        set({ compactMode: compact });
      },

      // 重置设置
      resetUISettings: () => {
        set(defaultUIState);
      },
    }),
    {
      name: 'onekey-ui-settings',
      version: 1,

      // 使用项目规范的存储配置
      storage: createJSONStorage(() => localStorage),

      // 只持久化需要的字段
      partialize: state => ({
        sidebarCollapsed: state.sidebarCollapsed,
        themePreference: state.themePreference,
        showAdvancedOptions: state.showAdvancedOptions,
        compactMode: state.compactMode,
      }),

      // 水合完成后的回调
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('UI settings rehydration failed:', error);
          } else if (state) {
            console.log('UI settings rehydrated successfully:', {
              sidebarCollapsed: state.sidebarCollapsed,
              themePreference: state.themePreference,
            });
          }
        };
      },
    }
  )
);

// 导出便捷的 hooks
export const useSidebarState = () => {
  const sidebarCollapsed = useUIStore(state => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore(state => state.setSidebarCollapsed);
  const toggleSidebar = useUIStore(state => state.toggleSidebar);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };
};

export const useThemePreference = () => {
  const themePreference = useUIStore(state => state.themePreference);
  const setThemePreference = useUIStore(state => state.setThemePreference);

  return {
    themePreference,
    setThemePreference,
  };
};
