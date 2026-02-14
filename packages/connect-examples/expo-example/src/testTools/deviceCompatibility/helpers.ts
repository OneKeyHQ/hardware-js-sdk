/**
 * 设备兼容性辅助函数
 * 在测试流程中统一处理「跳过执行」逻辑
 */

// 确保插件在使用前注册
import './plugins';
import { compatibilityManager } from './DeviceCompatibility';

/**
 * 在 generateRequestParams 中检查兼容性
 * 统一使用 overrides 规则进行匹配
 */
export function checkCompatibilityInParams(
  features: any,
  method: string,
  params: any
): { method: string; params: any } {
  const path = params?.path || params?.addressParameters?.path;
  const result = compatibilityManager.checkMethod(features, method, {
    path,
    params,
  });
  if (result.shouldSkip) {
    console.log(`Skip method by compatibility override: ${method} - ${result.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: result.reason },
    };
  }

  return { method, params };
}

/**
 * 在 processRequest 中拦截跳过逻辑
 */
export async function handleSkipInRequest(
  SDK: any,
  method: string,
  connectId: string,
  deviceId: string,
  requestParams: any
): Promise<{ payload: any; skipVerify: boolean }> {
  if (requestParams.__skipTest) {
    console.log(`Intercept request: ${method} - ${requestParams.__skipReason}`);
    return {
      payload: {
        success: true,
        payload: requestParams,
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
    const skipReason = res.__skipReason || 'Not supported';
    console.log(`Method skipped: ${item.method} - ${skipReason}`);
    return {
      shouldReturn: true,
      result: {
        error: skipReason,
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
    const pathResult = compatibilityManager.checkMethod(features, method, {
      path,
      params: bundleItem,
    });

    if (pathResult.shouldSkip) {
      skippedPaths.push(path);
      console.log(`Skip path (removed from request): ${method} ${path} - ${pathResult.reason}`);
      return false;
    }
    return true;
  });

  return { filteredBundle, skippedPaths };
}

/**
 * 批量测试专用：兼容性检查 + bundle 路径过滤
 * 用于 TestBatchAddress 的 generateRequestParams
 */
export function checkBatchCompatibility(
  features: any,
  item: any,
  extraParams: any
): { method: string; params: any } {
  const { method } = item;

  // 1. 先判断整方法是否需要跳过
  const methodResult = compatibilityManager.checkMethod(features, method);
  if (methodResult.shouldSkip) {
    console.log(`Skip entire method: ${method} - ${methodResult.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: methodResult.reason },
    };
  }

  // 2. 再做路径级别过滤
  const { params } = item;
  let skippedPaths: string[] = [];

  // bundle 批量请求：过滤不支持路径
  if (params.bundle && Array.isArray(params.bundle)) {
    const { filteredBundle, skippedPaths: paths } = filterUnsupportedPaths(
      features,
      method,
      params.bundle
    );
    skippedPaths = paths;

    // 全部路径都不支持时，跳过整条用例
    if (filteredBundle.length === 0 && params.bundle.length > 0) {
      console.log(`Skip entire method (all ${params.bundle.length} paths unsupported): ${method}`);
      return {
        method,
        params: {
          __skipTest: true,
          __skipReason: `All ${params.bundle.length} paths are not supported on this device`,
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

  // 非 bundle（单路径）场景
  const allPaths = Object.keys(item.result || {});
  allPaths.forEach(path => {
    const pathResult = compatibilityManager.checkMethod(features, method, {
      path,
      params,
    });
    if (pathResult.shouldSkip) {
      skippedPaths.push(path);
      console.log(`Skip path: ${method} ${path} - ${pathResult.reason}`);
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
 * 从 params 或 response 中提取跳过路径
 */
export function getSkippedPaths(params: any): string[] {
  return params?.__skippedPaths || [];
}
