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
  'targets',
  'types',
  'select',
  'resume',
  'firmwareVersion',
  'bleVersion',
  'bootloaderVersion',
] as const;

const LAZY_PARAMETER_VALUE_MARKER = '__expoPlaygroundLazyParameterValue';

export type LazyParameterValue<T = unknown> = {
  readonly [LAZY_PARAMETER_VALUE_MARKER]: true;
  readonly label?: string;
  readonly previewValue: unknown;
  readonly resolve: () => T;
};

export function createLazyParameterValue<T>({
  label,
  previewValue,
  resolve,
}: {
  label?: string;
  previewValue: unknown;
  resolve: () => T;
}): LazyParameterValue<T> {
  return {
    [LAZY_PARAMETER_VALUE_MARKER]: true,
    label,
    previewValue,
    resolve,
  };
}

export function isLazyParameterValue(value: unknown): value is LazyParameterValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)[LAZY_PARAMETER_VALUE_MARKER] === true &&
    typeof (value as { resolve?: unknown }).resolve === 'function'
  );
}

export function getParameterDisplayValue(value: unknown): unknown {
  if (isLazyParameterValue(value)) {
    return value.previewValue;
  }

  return value;
}

function resolveLazyParameterValue(paramName: string, value: unknown): unknown {
  if (!isLazyParameterValue(value)) {
    return value;
  }

  return parseParameterValue(paramName, value.resolve());
}

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
  if (isLazyParameterValue(value)) {
    return value;
  }

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
export function processParameters(
  params: Record<string, unknown>,
  options: { resolveLazyValues?: boolean } = {}
): Record<string, unknown> {
  const processedParams: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    const parsedValue = parseParameterValue(key, value);
    processedParams[key] = options.resolveLazyValues
      ? resolveLazyParameterValue(key, parsedValue)
      : parsedValue;
  });

  return processedParams;
}

export function resolveLazyParameterValues(
  params: Record<string, unknown>
): Record<string, unknown> {
  return processParameters(params, { resolveLazyValues: true });
}

/**
 * 展开点分参数名为嵌套对象。
 *
 * 例如 { 'targets.hw': true, 'types.hash': false } → { targets: { hw: true }, types: { hash: false } }。
 * 不含 '.' 的 key 原样保留，用于 deviceInfoGet 等需要嵌套布尔参数的方法。
 */
export function unflattenParameters(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (!key.includes('.')) {
      result[key] = value;
      return;
    }
    const segments = key.split('.');
    let cursor = result;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;
  });
  return result;
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
