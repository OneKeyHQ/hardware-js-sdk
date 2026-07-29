import axios, { type AxiosResponse } from 'axios';

export type HttpRequestOptions = {
  /** Additional request headers, such as a byte range for package metadata reads. */
  headers?: Record<string, string>;
  /** Axios adapter-defined request timeout retained for existing opt-in callers. */
  timeoutMs?: number;
  /** Deadline for DNS, connection, TLS, redirects, and the first response-body progress. */
  connectTimeoutMs?: number;
  /** Maximum idle interval between response-body progress events. */
  readTimeoutMs?: number;
  /** Wall-clock deadline across all attempts and retry backoff. */
  overallTimeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

const MAX_RETRY_COUNT = 3;
const REQUEST_PHASE_TIMEOUT_CODES = {
  connect: 'ECONNECTTIMEDOUT',
  read: 'EREADTIMEDOUT',
} as const;
const RETRYABLE_HTTP_STATUSES = new Set([500, 502, 503, 504]);
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  REQUEST_PHASE_TIMEOUT_CODES.connect,
  REQUEST_PHASE_TIMEOUT_CODES.read,
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

const createRequestPhaseTimeoutError = (
  url: string,
  phase: keyof typeof REQUEST_PHASE_TIMEOUT_CODES,
  timeoutMs: number
) => {
  const error = new Error(`httpRequest ${phase} timeout: ${url} ${timeoutMs}ms`);
  error.name = 'HttpRequestPhaseTimeoutError';
  return Object.assign(error, {
    code: REQUEST_PHASE_TIMEOUT_CODES[phase],
  });
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
  if (axios.isCancel(error)) {
    return false;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    RETRYABLE_NETWORK_ERROR_CODES.has(error.code)
  ) {
    return true;
  }
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (status !== undefined) {
    return RETRYABLE_HTTP_STATUSES.has(Number(status));
  }
  return false;
};

export const httpRequest = async <T = unknown>(
  url: string,
  type = 'text',
  options: HttpRequestOptions = {}
): Promise<T> => {
  const headers: Record<string, string> = { ...options.headers };
  if (url.indexOf('ngrok-free.app') > -1) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  const timeoutMs =
    Number.isSafeInteger(options.timeoutMs) && Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : undefined;
  const connectTimeoutMs =
    Number.isSafeInteger(options.connectTimeoutMs) && Number(options.connectTimeoutMs) > 0
      ? Number(options.connectTimeoutMs)
      : undefined;
  const readTimeoutMs =
    Number.isSafeInteger(options.readTimeoutMs) && Number(options.readTimeoutMs) > 0
      ? Number(options.readTimeoutMs)
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
  const overallTimeoutError = overallTimeoutMs
    ? createOverallTimeoutError(url, overallTimeoutMs)
    : undefined;
  const overallDeadlineAt = overallTimeoutMs ? Date.now() + overallTimeoutMs : undefined;
  const assertWithinOverallDeadline = () => {
    if (overallDeadlineAt !== undefined && overallTimeoutError && Date.now() >= overallDeadlineAt) {
      throw overallTimeoutError;
    }
  };

  const request = async (attempt: number, signal?: AbortSignal): Promise<T> => {
    assertWithinOverallDeadline();
    if (signal?.aborted) {
      throw createAbortError();
    }

    let response: AxiosResponse<T> | undefined;
    let requestError: unknown;
    let requestFailed = false;
    let phaseTimeoutError: ReturnType<typeof createRequestPhaseTimeoutError> | undefined;
    let phaseTimeoutTimer: ReturnType<typeof setTimeout> | undefined;
    const hasPhaseDeadline = Boolean(connectTimeoutMs || readTimeoutMs);
    const attemptController = signal || hasPhaseDeadline ? new AbortController() : undefined;
    let attemptSettled = false;
    let lastProgressLoaded = 0;
    const handleParentAbort = () => {
      attemptController?.abort();
    };
    const clearPhaseTimeout = () => {
      if (phaseTimeoutTimer) {
        clearTimeout(phaseTimeoutTimer);
        phaseTimeoutTimer = undefined;
      }
    };
    const armPhaseTimeout = (
      phase: keyof typeof REQUEST_PHASE_TIMEOUT_CODES,
      phaseTimeoutMs: number | undefined
    ) => {
      clearPhaseTimeout();
      if (!phaseTimeoutMs || !attemptController) {
        return;
      }
      phaseTimeoutTimer = setTimeout(() => {
        phaseTimeoutError = createRequestPhaseTimeoutError(url, phase, phaseTimeoutMs);
        attemptController.abort();
      }, phaseTimeoutMs);
    };

    if (signal) {
      signal.addEventListener('abort', handleParentAbort, { once: true });
    }
    armPhaseTimeout('connect', connectTimeoutMs);

    try {
      response = await axios.request<T>({
        url,
        withCredentials: false,
        responseType: type === 'binary' ? 'arraybuffer' : 'json',
        headers,
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
        ...(attemptController ? { signal: attemptController.signal } : {}),
        ...(hasPhaseDeadline
          ? {
              adapter: ['xhr', 'http'],
              onDownloadProgress: (progressEvent: { loaded: number }) => {
                if (
                  attemptSettled ||
                  attemptController?.signal.aborted ||
                  !Number.isFinite(progressEvent.loaded) ||
                  progressEvent.loaded <= lastProgressLoaded
                ) {
                  return;
                }
                lastProgressLoaded = progressEvent.loaded;
                armPhaseTimeout('read', readTimeoutMs);
              },
            }
          : {}),
      });
      if (phaseTimeoutError) {
        requestFailed = true;
        requestError = phaseTimeoutError;
        response = undefined;
      }
    } catch (error) {
      requestFailed = true;
      requestError = phaseTimeoutError ?? (signal?.aborted ? createAbortError() : error);
    } finally {
      attemptSettled = true;
      clearPhaseTimeout();
      signal?.removeEventListener('abort', handleParentAbort);
    }

    assertWithinOverallDeadline();

    if (requestFailed) {
      if (attempt >= maxRetries || !isRetryableRequestError(requestError)) {
        throw requestError;
      }
      await waitForRetry(retryDelayMs, attempt, signal);
      assertWithinOverallDeadline();
      return request(attempt + 1, signal);
    }

    if (!response) {
      throw new Error(`httpRequest completed without a response: ${url}`);
    }

    if (+response.status >= 200 && +response.status < 300) {
      return response.data;
    }

    if (RETRYABLE_HTTP_STATUSES.has(Number(response.status)) && attempt < maxRetries) {
      await waitForRetry(retryDelayMs, attempt, signal);
      assertWithinOverallDeadline();
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
        reject(overallTimeoutError);
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
