import type { Response } from '../types/response';

/**
 * Generic batch call with progress reporting.
 * If any single call fails, returns the failure immediately.
 */
export async function batchCall<TParam, TResult>(
  params: TParam[],
  callFn: (p: TParam) => Promise<Response<TResult>>,
  onProgress?: (progress: { index: number; total: number }) => void
): Promise<Response<TResult[]>> {
  const results: TResult[] = [];
  for (let i = 0; i < params.length; i++) {
    const result = await callFn(params[i]);
    if (!result.success) {
      return result;
    }
    results.push(result.payload);
    onProgress?.({ index: i, total: params.length });
  }
  return { success: true, payload: results };
}
