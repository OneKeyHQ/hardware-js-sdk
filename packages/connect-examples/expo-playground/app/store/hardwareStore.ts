import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 通用参数状态
export interface CommonParametersState {
  useEmptyPassphrase: boolean;
  passphraseState: string;
  deriveCardano: boolean;
  // passphraseState 只做会话缓存，页面刷新即丢失
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
  passphraseState: '',
  deriveCardano: false,
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
        state => {
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
        'setCommonParameter'
      );
    },

    // 批量设置通用参数
    setCommonParameters: params => {
      set(
        state => {
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
        'setCommonParameters'
      );
    },

    // 设置单个方法参数
    setMethodParameter: (key: string, value: unknown) => {
      set(
        state => {
          const newMethodParams = { ...state.methodParameters, [key]: value };
          const newExecutionParameters = calculateExecutionParameters(
            state.commonParameters,
            newMethodParams
          );

          return {
            methodParameters: newMethodParams,
            executionParameters: newExecutionParameters,
          };
        },
        false,
        'setMethodParameter'
      );
    },

    // 批量设置方法参数
    setMethodParameters: (params: Record<string, unknown>) => {
      set(
        state => {
          const newExecutionParameters = calculateExecutionParameters(
            state.commonParameters,
            params
          );

          return {
            methodParameters: params,
            executionParameters: newExecutionParameters,
          };
        },
        false,
        'setMethodParameters'
      );
    },

    // 手动更新执行参数
    updateExecutionParameters: () => {
      set(
        state => ({
          executionParameters: calculateExecutionParameters(
            state.commonParameters,
            state.methodParameters
          ),
        }),
        false,
        'updateExecutionParameters'
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
        'resetParameters'
      );
    },

    // 重置方法参数
    resetMethodParameters: () => {
      set(
        state => {
          const newExecutionParameters = calculateExecutionParameters(state.commonParameters, {});

          return {
            methodParameters: {},
            executionParameters: newExecutionParameters,
          };
        },
        false,
        'resetMethodParameters'
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
      if (value === null || value === undefined || value === '') {
        return false;
      }
      return true;
    })
  );

  // 🔥 核心逻辑：当 useEmptyPassphrase 为 true 时，移除 passphraseState
  if (cleanParams.useEmptyPassphrase === true) {
    console.log('[HardwareStore] 🔐 useEmptyPassphrase=true，移除passphraseState参数');
    delete cleanParams.passphraseState;
  }

  return cleanParams;
}

// 文件转换工具函数
export async function convertFilesToArrayBuffers(
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const result = { ...params };

  // 文件转换辅助函数
  const fileToArrayBuffer = async (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  // 处理文件参数
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof File) {
      try {
        const arrayBuffer = await fileToArrayBuffer(value);
        result[key] = arrayBuffer;

        console.log(
          `[FileConverter] 📁 文件参数转换: ${key} -> ArrayBuffer (${arrayBuffer.byteLength} bytes)`
        );
      } catch (error) {
        console.error(`[FileConverter] ❌ 文件转换失败: ${key}`, error);
        delete result[key];
      }
    }
  }

  return result;
}
