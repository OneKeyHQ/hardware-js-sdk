import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  passphraseState: '',
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
  if (cleanParams.usePassphraseState === false) {
    delete cleanParams.passphraseState;
  }

  delete cleanParams.usePassphraseState; // 移除 UI辅助参数

  console.log('[HardwareStore] 📋 计算执行参数:', {
    原始通用参数: commonParams,
    原始方法参数: methodParams,
    最终执行参数: cleanParams,
  });

  return cleanParams;
}

// 文件类型配置
const FILE_TYPE_CONFIGS = {
  // 固件相关文件
  firmware: {
    extensions: ['.bin', '.hex', '.fw'],
    mimeType: 'application/octet-stream',
    parameterNames: ['binary', 'firmwareFile', 'firmwareBinary'],
  },
  ble: {
    extensions: ['.bin', '.hex', '.fw'],
    mimeType: 'application/octet-stream',
    parameterNames: ['bleBinary', 'bleFile'],
  },
  bootloader: {
    extensions: ['.bin', '.hex'],
    mimeType: 'application/octet-stream',
    parameterNames: ['bootloaderBinary', 'bootloaderFile'],
  },
  resource: {
    extensions: ['.zip'],
    mimeType: 'application/zip',
    parameterNames: ['resourceBinary', 'resourceFile'],
  },
};

// 智能检测文件类型
function detectFileType(paramName: string, fileName?: string): string | null {
  // 1. 通过参数名称检测
  for (const [type, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (
      config.parameterNames.some(
        name =>
          paramName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(paramName.toLowerCase())
      )
    ) {
      return type;
    }
  }

  // 2. 通过文件扩展名检测
  if (fileName) {
    const extension = '.' + fileName.toLowerCase().split('.').pop();
    for (const [type, config] of Object.entries(FILE_TYPE_CONFIGS)) {
      if (config.extensions.includes(extension)) {
        return type;
      }
    }
  }

  // 3. 默认为固件类型
  return 'firmware';
}

// 获取目标参数名称
function getTargetParameterName(paramName: string, fileType: string): string {
  // 如果参数名已经是标准的 SDK 参数名，直接返回
  const standardNames = [
    'binary',
    'firmwareBinary',
    'bleBinary',
    'bootloaderBinary',
    'resourceBinary',
  ];
  if (standardNames.includes(paramName)) {
    return paramName;
  }

  // 根据文件类型映射到标准参数名
  const typeToParamMap: Record<string, string> = {
    firmware: 'binary', // 对于 firmwareUpdateV2，使用 binary
    ble: 'binary', // 对于 firmwareUpdateV2，使用 binary
    bootloader: 'binary', // 对于 deviceUpdateBootloader，使用 binary
    resource: 'binary', // 对于 deviceFullyUploadResource，使用 binary
  };

  // 特殊处理：如果是 firmwareUpdateV3，使用具体的参数名
  if (paramName.includes('firmware') && fileType === 'firmware') {
    return 'firmwareBinary';
  }
  if (paramName.includes('ble') && fileType === 'ble') {
    return 'bleBinary';
  }
  if (paramName.includes('bootloader') && fileType === 'bootloader') {
    return 'bootloaderBinary';
  }
  if (paramName.includes('resource') && fileType === 'resource') {
    return 'resourceBinary';
  }

  return typeToParamMap[fileType] || 'binary';
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

        // 智能检测文件类型
        const fileType = detectFileType(key, value.name);

        // 获取目标参数名称
        const targetParamName = getTargetParameterName(key, fileType || 'firmware');

        // 设置转换后的参数
        result[targetParamName] = arrayBuffer;

        // 删除原始文件参数（如果参数名不同）
        if (key !== targetParamName) {
          delete result[key];
        }

        console.log(
          `[FileConverter] 📁 文件参数转换: ${key} (${fileType}) -> ${targetParamName} (${arrayBuffer.byteLength} bytes)`
        );
      } catch (error) {
        console.error(`[FileConverter] ❌ 文件转换失败: ${key}`, error);
        delete result[key];
      }
    }
  }

  return result;
}
