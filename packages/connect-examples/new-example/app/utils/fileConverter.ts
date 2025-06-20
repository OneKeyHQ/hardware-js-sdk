// 文件类型配置
const FILE_TYPE_CONFIGS = {
  // 固件相关文件
  firmware: {
    extensions: ['.bin'],
    mimeType: 'application/octet-stream',
    parameterNames: ['binary', 'firmwareFile', 'firmwareBinary'],
  },
  ble: {
    extensions: ['.bin'],
    mimeType: 'application/octet-stream',
    parameterNames: ['bleBinary', 'bleFile'],
  },
  bootloader: {
    extensions: ['.bin'],
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
