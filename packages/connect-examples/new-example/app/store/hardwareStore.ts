import { create } from "zustand";
import { devtools } from "zustand/middleware";

// 通用参数状态
export interface CommonParametersState {
  useEmptyPassphrase: boolean;
  passphraseState: string;
  // UI辅助参数
  usePassphraseState: boolean;
}

// 完整的硬件状态
export interface HardwareState {
  // 通用参数状态  
  commonParameters: CommonParametersState;
  
  // 方法参数状态
  methodParameters: Record<string, unknown>;
  
  // 最终执行参数（经过处理的参数，即将发送给SDK）
  executionParameters: Record<string, unknown>;
  
  // Actions
  setCommonParameter: (key: keyof CommonParametersState, value: unknown) => void;
  setCommonParameters: (params: Partial<CommonParametersState>) => void;
  setMethodParameter: (key: string, value: unknown) => void;
  setMethodParameters: (params: Record<string, unknown>) => void;
  updateExecutionParameters: () => void; // 根据当前参数计算最终执行参数
  getExecutionParameters: () => Record<string, unknown>; // 获取处理后的执行参数
  resetParameters: () => void;
  resetMethodParameters: () => void;
}

const initialCommonParameters: CommonParametersState = {
  useEmptyPassphrase: false,
  passphraseState: "",
  usePassphraseState: false,
};

export const useHardwareStore = create<HardwareState>()(
  devtools((set, get) => ({
    // 初始状态
    commonParameters: initialCommonParameters,
    methodParameters: {},
    executionParameters: {},

    // 设置单个通用参数
    setCommonParameter: (key, value) => {
      set(
        (state) => {
          const newCommonParameters = {
            ...state.commonParameters,
            [key]: value,
          };
          
          // 自动更新执行参数
          const newExecutionParameters = calculateExecutionParameters(
            newCommonParameters,
            state.methodParameters
          );
          
          return {
            commonParameters: newCommonParameters,
            executionParameters: newExecutionParameters,
          };
        },
        false,
        "setCommonParameter"
      );
    },

    // 批量设置通用参数
    setCommonParameters: (params) => {
      set(
        (state) => {
          const newCommonParameters = {
            ...state.commonParameters,
            ...params,
          };
          
          // 自动更新执行参数
          const newExecutionParameters = calculateExecutionParameters(
            newCommonParameters,
            state.methodParameters
          );
          
          return {
            commonParameters: newCommonParameters,
            executionParameters: newExecutionParameters,
          };
        },
        false,
        "setCommonParameters"
      );
    },

    // 设置单个方法参数
    setMethodParameter: (key, value) => {
      set(
        (state) => {
          const newMethodParameters = {
            ...state.methodParameters,
            [key]: value,
          };
          
          // 自动更新执行参数
          const newExecutionParameters = calculateExecutionParameters(
            state.commonParameters,
            newMethodParameters
          );
          
          return {
            methodParameters: newMethodParameters,
            executionParameters: newExecutionParameters,
          };
        },
        false,
        "setMethodParameter"
      );
    },

    // 批量设置方法参数
    setMethodParameters: (params) => {
      set(
        (state) => {
          // 🔥 如果传入空对象，直接替换；否则合并参数
          const newMethodParameters = Object.keys(params).length === 0 
            ? params  // 直接替换为空对象
            : { ...state.methodParameters, ...params }; // 合并参数
          
          // 自动更新执行参数
          const newExecutionParameters = calculateExecutionParameters(
            state.commonParameters,
            newMethodParameters
          );
          
          console.log("[HardwareStore] 🔄 批量设置方法参数:", {
            旧参数: state.methodParameters,
            新参数: params,
            是否清空: Object.keys(params).length === 0,
            最终参数: newMethodParameters,
          });
          
          return {
            methodParameters: newMethodParameters,
            executionParameters: newExecutionParameters,
          };
        },
        false,
        "setMethodParameters"
      );
    },

    // 手动更新执行参数
    updateExecutionParameters: () => {
      set(
        (state) => ({
          executionParameters: calculateExecutionParameters(
            state.commonParameters,
            state.methodParameters
          ),
        }),
        false,
        "updateExecutionParameters"
      );
    },

    // 获取最终执行参数
    getExecutionParameters: () => {
      const state = get();
      return state.executionParameters;
    },

    // 重置所有参数
    resetParameters: () => {
      set(
        () => ({
          commonParameters: initialCommonParameters,
          methodParameters: {},
          executionParameters: {},
        }),
        false,
        "resetParameters"
      );
    },

    // 重置方法参数
    resetMethodParameters: () => {
      set(
        (state) => {
          const newExecutionParameters = calculateExecutionParameters(
            state.commonParameters,
            {}
          );
          
          return {
            methodParameters: {},
            executionParameters: newExecutionParameters,
          };
        },
        false,
        "resetMethodParameters"
      );
    },
  }))
);

// 核心逻辑：根据通用参数和方法参数计算最终执行参数
function calculateExecutionParameters(
  commonParams: CommonParametersState,
  methodParams: Record<string, unknown>
): Record<string, unknown> {
  // 合并所有参数
  const allParams = {
    ...methodParams,
    ...commonParams,
  };

  // 过滤无效值
  const cleanParams = Object.fromEntries(
    Object.entries(allParams).filter(([, value]) => {
      if (value === null || value === undefined || value === "") {
        return false;
      }
      return true;
    })
  );

  // 🔥 核心逻辑：当 useEmptyPassphrase 为 true 时，移除 passphraseState
  if (cleanParams.useEmptyPassphrase === true) {
    console.log("[HardwareStore] 🔐 useEmptyPassphrase=true，移除passphraseState参数");
    delete cleanParams.passphraseState;
  }
  if(cleanParams.usePassphraseState === false){
    delete cleanParams.passphraseState;
  }

  delete cleanParams.usePassphraseState; // 移除 UI辅助参数

  console.log("[HardwareStore] 📋 计算执行参数:", {
    原始通用参数: commonParams,
    原始方法参数: methodParams,
    最终执行参数: cleanParams,
  });

  return cleanParams;
} 