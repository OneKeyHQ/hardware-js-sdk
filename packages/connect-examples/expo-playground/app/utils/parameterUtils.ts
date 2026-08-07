/**
 * 参数处理工具函数
 * 统一处理方法参数的 JSON 解析和转换逻辑
 */

// 需要 JSON 解析的参数名称列表
const JSON_PARAMETER_NAMES = [
  'bundle',
  'transaction',
  'inputs',
  'outputs',
  'refTxs',
  'payload',
] as const;

/**
 * 检查参数是否需要 JSON 解析
 * @param paramName 参数名称
 * @param value 参数值
 * @returns 是否需要 JSON 解析
 */
export function shouldParseAsJSON(paramName: string, value: unknown): boolean {
  // 如果参数名在列表中，且值是字符串，且看起来像 JSON
  if (
    JSON_PARAMETER_NAMES.includes(paramName as (typeof JSON_PARAMETER_NAMES)[number]) &&
    typeof value === 'string'
  ) {
    const trimmedValue = value.trim();
    return trimmedValue.startsWith('{') || trimmedValue.startsWith('[');
  }

  return false;
}

/**
 * 智能解析参数值
 * @param paramName 参数名称
 * @param value 参数值
 * @returns 解析后的参数值
 */
export function parseParameterValue(paramName: string, value: unknown): unknown {
  // 如果值已经是对象，直接返回（预设值可能已经是对象）
  if (
    typeof value === 'object' &&
    value !== null &&
    JSON_PARAMETER_NAMES.includes(paramName as (typeof JSON_PARAMETER_NAMES)[number])
  ) {
    console.log(`[ParameterUtils] ${paramName} 参数已经是对象，直接使用`);
    return value;
  }

  // 如果是需要 JSON 解析的字符串参数
  if (shouldParseAsJSON(paramName, value)) {
    try {
      const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
      console.log(`[ParameterUtils] 解析 ${paramName} 参数为 JSON 对象`);
      return parsedValue;
    } catch (error) {
      console.warn(`[ParameterUtils] Failed to parse ${paramName} as JSON:`, error);
      return value; // 解析失败时返回原始值
    }
  }

  return value;
}

/**
 * 批量处理参数对象
 * @param params 参数对象
 * @returns 处理后的参数对象
 */
export function processParameters(params: Record<string, unknown>): Record<string, unknown> {
  const processedParams: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    processedParams[key] = parseParameterValue(key, value);
  });

  return processedParams;
}

/**
 * 分离通用参数和方法参数
 * @param data 原始参数数据
 * @returns 分离后的参数对象
 */
export function separateParameters(data: Record<string, unknown>): {
  methodParams: Record<string, unknown>;
  commonParams: Record<string, unknown>;
} {
  const commonParamNames = ['useEmptyPassphrase', 'passphraseState', 'deriveCardano'];
  const methodParams: Record<string, unknown> = {};
  const commonParams: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (commonParamNames.includes(key)) {
      commonParams[key] = value;
    } else {
      // 智能处理可能需要 JSON 解析的参数
      methodParams[key] = parseParameterValue(key, value);
    }
  });

  return { methodParams, commonParams };
}
