import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 方法参数状态接口
export interface MethodState {
  // 保存的方法参数 - 按方法名分组
  savedParameters: Record<string, Record<string, unknown>>;

  // 最后选择的预设 - 按方法名分组
  lastSelectedPresets: Record<string, string>;

  // 最近使用的方法
  recentMethods: string[];

  // Actions
  saveMethodParameters: (methodName: string, parameters: Record<string, unknown>) => void;
  getMethodParameters: (methodName: string) => Record<string, unknown>;
  clearMethodParameters: (methodName: string) => void;

  setLastSelectedPreset: (methodName: string, presetTitle: string) => void;
  getLastSelectedPreset: (methodName: string) => string | null;

  addRecentMethod: (methodName: string) => void;
  clearRecentMethods: () => void;

  // 重置所有方法数据
  resetMethodData: () => void;
}

// 默认状态
const defaultMethodState = {
  savedParameters: {},
  lastSelectedPresets: {},
  recentMethods: [],
};

// 创建方法状态存储
export const useMethodStore = create<MethodState>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...defaultMethodState,

      // 保存方法参数
      saveMethodParameters: (methodName: string, parameters: Record<string, unknown>) => {
        set(state => ({
          savedParameters: {
            ...state.savedParameters,
            [methodName]: parameters,
          },
        }));
      },

      // 获取方法参数
      getMethodParameters: (methodName: string) => {
        const state = get();
        return state.savedParameters[methodName] || {};
      },

      // 清除方法参数
      clearMethodParameters: (methodName: string) => {
        set(state => {
          const newSavedParameters = { ...state.savedParameters };
          delete newSavedParameters[methodName];
          return { savedParameters: newSavedParameters };
        });
      },

      // 设置最后选择的预设
      setLastSelectedPreset: (methodName: string, presetTitle: string) => {
        set(state => ({
          lastSelectedPresets: {
            ...state.lastSelectedPresets,
            [methodName]: presetTitle,
          },
        }));
      },

      // 获取最后选择的预设
      getLastSelectedPreset: (methodName: string) => {
        const state = get();
        return state.lastSelectedPresets[methodName] || null;
      },

      // 添加最近使用的方法
      addRecentMethod: (methodName: string) => {
        set(state => {
          const newRecentMethods = [
            methodName,
            ...state.recentMethods.filter(name => name !== methodName),
          ].slice(0, 10); // 只保留最近10个

          return { recentMethods: newRecentMethods };
        });
      },

      // 清除最近使用的方法
      clearRecentMethods: () => {
        set({ recentMethods: [] });
      },

      // 重置所有方法数据
      resetMethodData: () => {
        set(defaultMethodState);
      },
    }),
    {
      name: 'onekey-method-settings',
      version: 1,

      // 使用项目规范的存储配置
      storage: createJSONStorage(() => localStorage),

      // 只持久化需要的字段
      partialize: state => ({
        savedParameters: state.savedParameters,
        lastSelectedPresets: state.lastSelectedPresets,
        recentMethods: state.recentMethods,
      }),

      // 水合完成后的回调
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('Method settings rehydration failed:', error);
          } else if (state) {
            console.log('Method settings rehydrated successfully:', {
              savedParametersCount: Object.keys(state.savedParameters).length,
              recentMethodsCount: state.recentMethods.length,
            });
          }
        };
      },
    }
  )
);

// 导出便捷的 hooks
export const useMethodParameters = (methodName: string) => {
  const saveMethodParameters = useMethodStore(state => state.saveMethodParameters);
  const getMethodParameters = useMethodStore(state => state.getMethodParameters);
  const clearMethodParameters = useMethodStore(state => state.clearMethodParameters);

  return {
    saveParameters: (parameters: Record<string, unknown>) =>
      saveMethodParameters(methodName, parameters),
    getParameters: () => getMethodParameters(methodName),
    clearParameters: () => clearMethodParameters(methodName),
  };
};

export const useMethodPresets = (methodName: string) => {
  const setLastSelectedPreset = useMethodStore(state => state.setLastSelectedPreset);
  const getLastSelectedPreset = useMethodStore(state => state.getLastSelectedPreset);

  return {
    setLastPreset: (presetTitle: string) => setLastSelectedPreset(methodName, presetTitle),
    getLastPreset: () => getLastSelectedPreset(methodName),
  };
};

export const useRecentMethods = () => {
  const recentMethods = useMethodStore(state => state.recentMethods);
  const addRecentMethod = useMethodStore(state => state.addRecentMethod);
  const clearRecentMethods = useMethodStore(state => state.clearRecentMethods);

  return {
    recentMethods,
    addRecentMethod,
    clearRecentMethods,
  };
};
