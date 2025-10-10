/**
 * 设备兼容性检查辅助函数
 * 用于在测试中统一处理兼容性检查逻辑
 */

import { compatibilityManager } from './DeviceCompatibility';

/**
 * 在 generateRequestParams 中检查兼容性
 * 检查方法级别和路径级别的兼容性
 */
export function checkCompatibilityInParams(
  features: any,
  method: string,
  params: any
): { method: string; params: any } {
  // 1️⃣ 检查方法级别兼容性
  const methodResult = compatibilityManager.checkMethod(features, method);

  if (methodResult.shouldSkip) {
    console.log(`🚫 跳过方法: ${method} - ${methodResult.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: methodResult.reason },
    };
  }

  // 2️⃣ 检查路径级别兼容性
  const path = params?.path || params?.addressParameters?.path;
  if (path) {
    const pathResult = compatibilityManager.checkMethod(features, method, path);
    if (pathResult.shouldSkip) {
      console.log(`🚫 跳过路径: ${method} ${path} - ${pathResult.reason}`);
      return {
        method,
        params: { __skipTest: true, __skipReason: pathResult.reason },
      };
    }
  }

  return { method, params };
}

/**
 * 在 processRequest 中拦截跳过的请求
 */
export async function handleSkipInRequest(
  SDK: any,
  method: string,
  connectId: string,
  deviceId: string,
  requestParams: any
): Promise<{ payload: any; skipVerify: boolean }> {
  if (requestParams.__skipTest) {
    console.log(`🚫 拦截请求: ${method} - ${requestParams.__skipReason}`);
    // 返回符合 SDK 响应格式的对象
    // payload.payload 才是 processResponse 接收到的第一个参数
    return {
      payload: {
        success: true,
        payload: requestParams, // 这个会被传入 processResponse
      },
      skipVerify: true,
    };
  }

  // 正常调用 SDK
  const res = await SDK[method](connectId, deviceId, requestParams);
  return { payload: res, skipVerify: false };
}

/**
 * 在 processResponse 中处理跳过状态
 */
export function handleSkipInResponse(
  res: any,
  item: any
): { shouldReturn: boolean; result?: { error: string; verifyState: 'skip'; skipReason?: string } } {
  if (res && res.__skipTest) {
    const skipReason = res.__skipReason || '设备不支持';
    console.log(`✅ 方法跳过: ${item.method} - ${skipReason}`);
    return {
      shouldReturn: true,
      result: {
        error: skipReason, // 将跳过原因放入 error 字段，这样 UI 可以显示
        verifyState: 'skip' as const,
      },
    };
  }

  return { shouldReturn: false };
}

/**
 * 过滤 bundle 中不支持的路径
 */
export function filterUnsupportedPaths(
  features: any,
  method: string,
  bundle: any[]
): { filteredBundle: any[]; skippedPaths: string[] } {
  const skippedPaths: string[] = [];

  const filteredBundle = bundle.filter((bundleItem: any) => {
    const path = bundleItem.path || bundleItem.addressParameters?.path;
    const pathResult = compatibilityManager.checkMethod(features, method, path);

    if (pathResult.shouldSkip) {
      skippedPaths.push(path);
      console.log(`🚫 跳过路径（已从请求中移除）: ${method} ${path} - ${pathResult.reason}`);
      return false;
    }
    return true;
  });

  return { filteredBundle, skippedPaths };
}

/**
 * 批量测试专用：检查兼容性并处理 bundle 路径过滤
 * 用于 TestBatchAddress 的 generateRequestParams
 */
export function checkBatchCompatibility(
  features: any,
  item: any,
  extraParams: any
): { method: string; params: any } {
  const { method } = item;

  // 1️⃣ 检查方法级别兼容性
  const methodResult = compatibilityManager.checkMethod(features, method);
  if (methodResult.shouldSkip) {
    console.log(`🚫 跳过整个方法: ${method} - ${methodResult.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: methodResult.reason },
    };
  }

  // 2️⃣ 检查路径级别兼容性
  const { params } = item;
  let skippedPaths: string[] = [];

  // 如果有 bundle（批量请求），过滤掉不支持的路径
  if (params.bundle && Array.isArray(params.bundle)) {
    const { filteredBundle, skippedPaths: paths } = filterUnsupportedPaths(
      features,
      method,
      params.bundle
    );
    skippedPaths = paths;

    // 🎯 如果所有路径都被过滤掉，跳过整个测试
    if (filteredBundle.length === 0 && params.bundle.length > 0) {
      console.log(`🚫 跳过整个方法（所有 ${params.bundle.length} 个路径都不支持）: ${method}`);
      return {
        method,
        params: {
          __skipTest: true,
          __skipReason: `所有 ${params.bundle.length} 个路径都不支持当前设备`,
        },
      };
    }

    return {
      method,
      params: {
        ...params,
        bundle: filteredBundle,
        ...extraParams,
        __skippedPaths: skippedPaths,
      },
    };
  }

  // 非 bundle 请求（单路径）- 检查所有路径
  const allPaths = Object.keys(item.result || {});
  allPaths.forEach(path => {
    const pathResult = compatibilityManager.checkMethod(features, method, path);
    if (pathResult.shouldSkip) {
      skippedPaths.push(path);
      console.log(`🚫 跳过路径: ${method} ${path} - ${pathResult.reason}`);
    }
  });

  return {
    method,
    params: {
      ...params,
      ...extraParams,
      __skippedPaths: skippedPaths,
    },
  };
}

/**
 * 从 params 或 response 中提取跳过的路径列表
 * 用于避免重复计算兼容性
 */
export function getSkippedPaths(params: any): string[] {
  return params?.__skippedPaths || [];
}
