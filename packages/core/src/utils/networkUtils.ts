import axios from 'axios';

export type HttpRequestOptions = {
  timeoutMs?: number;
  overallTimeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

const MAX_RETRY_COUNT = 3;
const RETRYABLE_HTTP_STATUSES = new Set([500, 502, 503, 504]);
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ERR_NETWORK',
  'ETIMEDOUT',
]);

const createAbortError = () => {
  const error = new Error('httpRequest aborted');
  error.name = 'AbortError';
  return error;
};

const createOverallTimeoutError = (url: string, timeoutMs: number) => {
  const error = new Error(`httpRequest overall timeout: ${url} ${timeoutMs}ms`);
  error.name = 'HttpRequestOverallTimeoutError';
  return error;
};

const waitForRetry = async (delayMs: number, attempt: number, signal?: AbortSignal) => {
  const backoffMs = delayMs * 2 ** attempt;
  if (backoffMs <= 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, backoffMs);
    const handleAbort = () => {
      clearTimeout(timeoutTimer);
      reject(createAbortError());
    };
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
};

const isRetryableRequestError = (error: unknown) => {
  if (axios.isCancel(error) || !axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (status !== undefined) {
    return RETRYABLE_HTTP_STATUSES.has(Number(status));
  }
  return typeof error.code === 'string' && RETRYABLE_NETWORK_ERROR_CODES.has(error.code);
};

export const httpRequest = async <T = unknown>(
  url: string,
  type = 'text',
  options: HttpRequestOptions = {}
): Promise<T> => {
  const headers: any = {};
  if (url.indexOf('ngrok-free.app') > -1) {
    headers['ngrok-skip-browser-warning'] = true;
  }

  const timeoutMs =
    Number.isSafeInteger(options.timeoutMs) && Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : undefined;
  const overallTimeoutMs =
    Number.isSafeInteger(options.overallTimeoutMs) && Number(options.overallTimeoutMs) > 0
      ? Number(options.overallTimeoutMs)
      : undefined;
  const maxRetries =
    Number.isSafeInteger(options.maxRetries) && Number(options.maxRetries) > 0
      ? Math.min(Number(options.maxRetries), MAX_RETRY_COUNT)
      : 0;
  const retryDelayMs =
    Number.isSafeInteger(options.retryDelayMs) && Number(options.retryDelayMs) > 0
      ? Number(options.retryDelayMs)
      : 0;

  const request = async (attempt: number, signal?: AbortSignal): Promise<T> => {
    if (signal?.aborted) {
      throw createAbortError();
    }

    let response;
    try {
      response = await axios.request<T>({
        url,
        withCredentials: false,
        responseType: type === 'binary' ? 'arraybuffer' : 'json',
        headers,
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableRequestError(error)) {
        throw error;
      }
      await waitForRetry(retryDelayMs, attempt, signal);
      return request(attempt + 1, signal);
    }

    if (+response.status === 200) {
      return response.data;
    }

    if (RETRYABLE_HTTP_STATUSES.has(Number(response.status)) && attempt < maxRetries) {
      await waitForRetry(retryDelayMs, attempt, signal);
      return request(attempt + 1, signal);
    }

    throw new Error(`httpRequest error: ${url} ${response.statusText}`);
  };

  if (!overallTimeoutMs) {
    return request(0);
  }

  const controller = new AbortController();
  const requestPromise = request(0, controller.signal);
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(createOverallTimeoutError(url, overallTimeoutMs));
        controller.abort();
      }, overallTimeoutMs);
      requestPromise.then(resolve, reject);
    });
  } finally {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
    }
  }
};
