/**
 * 设备兼容性辅助函数
 * 在测试流程中统一处理设备兼容性参数
 */

// 确保插件在使用前注册
import './plugins';

/**
 * 在 generateRequestParams 中检查兼容性
 * 当前不再注入 skip 标记，仅透传请求参数
 */
export function checkCompatibilityInParams(
  _features: any,
  method: string,
  params: any
): { method: string; params: any } {
  return { method, params };
}

/**
 * 执行请求（保留原方法名以兼容调用方）
 */
export async function handleSkipInRequest(
  SDK: any,
  method: string,
  connectId: string,
  deviceId: string,
  requestParams: any
): Promise<{ payload: any; skipVerify: boolean }> {
  const res = await SDK[method](connectId, deviceId, requestParams);
  return { payload: res, skipVerify: false };
}

/**
 * 保留兼容接口，不再处理 skip 逻辑
 */
export function handleSkipInResponse(
  _res: any,
  _item: any
): { shouldReturn: boolean; result?: { error: string; verifyState: 'skip'; skipReason?: string } } {
  return { shouldReturn: false };
}

/**
 * 保留兼容接口，不再过滤路径
 */
export function filterUnsupportedPaths(
  _features: any,
  _method: string,
  bundle: any[]
): { filteredBundle: any[]; skippedPaths: string[] } {
  return { filteredBundle: bundle, skippedPaths: [] };
}

/**
 * 批量测试专用：保留兼容接口，不再进行 skip 处理
 */
export function checkBatchCompatibility(
  _features: any,
  item: any,
  extraParams: any
): { method: string; params: any } {
  const { method } = item;
  const { params } = item;

  if (params.bundle && Array.isArray(params.bundle)) {
    return {
      method,
      params: {
        ...params,
        ...extraParams,
      },
    };
  }

  return {
    method,
    params: {
      ...params,
      ...extraParams,
    },
  };
}

/**
 * 保留兼容接口
 */
export function getSkippedPaths(_params: any): string[] {
  return [];
}
