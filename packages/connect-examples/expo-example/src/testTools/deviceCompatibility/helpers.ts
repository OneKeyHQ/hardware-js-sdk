/**
 * Device compatibility check helper functions
 * Unified compatibility check logic for tests
 */

// Ensure plugins are registered
import './plugins';
import { compatibilityManager } from './DeviceCompatibility';

/**
 * Check compatibility in generateRequestParams
 * Checks method-level, path-level and param-level compatibility
 */
export function checkCompatibilityInParams(
  features: any,
  method: string,
  params: any
): { method: string; params: any } {
  // 1. Check method-level compatibility
  const methodResult = compatibilityManager.checkMethod(features, method);

  if (methodResult.shouldSkip) {
    console.log(`Skip method: ${method} - ${methodResult.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: methodResult.reason },
    };
  }

  // 2. Check path-level compatibility
  const path = params?.path || params?.addressParameters?.path;
  if (path) {
    const pathResult = compatibilityManager.checkMethod(features, method, path);
    if (pathResult.shouldSkip) {
      console.log(`Skip path: ${method} ${path} - ${pathResult.reason}`);
      return {
        method,
        params: { __skipTest: true, __skipReason: pathResult.reason },
      };
    }
  }

  // 3. Check param-level compatibility (e.g. EIP-7702)
  const paramsResult = compatibilityManager.checkMethod(features, method, { path, params });
  if (paramsResult.shouldSkip) {
    console.log(`Skip param condition: ${method} - ${paramsResult.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: paramsResult.reason },
    };
  }

  return { method, params };
}

/**
 * Intercept skipped requests in processRequest
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

  // Normal SDK call
  const res = await SDK[method](connectId, deviceId, requestParams);
  return { payload: res, skipVerify: false };
}

/**
 * Handle skip status in processResponse
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
 * Filter unsupported paths from bundle
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
      console.log(`Skip path (removed from request): ${method} ${path} - ${pathResult.reason}`);
      return false;
    }
    return true;
  });

  return { filteredBundle, skippedPaths };
}

/**
 * Batch test: check compatibility and filter bundle paths
 * Used in TestBatchAddress's generateRequestParams
 */
export function checkBatchCompatibility(
  features: any,
  item: any,
  extraParams: any
): { method: string; params: any } {
  const { method } = item;

  // 1. Check method-level compatibility
  const methodResult = compatibilityManager.checkMethod(features, method);
  if (methodResult.shouldSkip) {
    console.log(`Skip entire method: ${method} - ${methodResult.reason}`);
    return {
      method,
      params: { __skipTest: true, __skipReason: methodResult.reason },
    };
  }

  // 2. Check path-level compatibility
  const { params } = item;
  let skippedPaths: string[] = [];

  // If bundle exists (batch request), filter out unsupported paths
  if (params.bundle && Array.isArray(params.bundle)) {
    const { filteredBundle, skippedPaths: paths } = filterUnsupportedPaths(
      features,
      method,
      params.bundle
    );
    skippedPaths = paths;

    // If all paths are filtered out, skip the entire test
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

  // Non-bundle request (single path) - check all paths
  const allPaths = Object.keys(item.result || {});
  allPaths.forEach(path => {
    const pathResult = compatibilityManager.checkMethod(features, method, path);
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
 * Extract skipped paths list from params or response
 */
export function getSkippedPaths(params: any): string[] {
  return params?.__skippedPaths || [];
}
