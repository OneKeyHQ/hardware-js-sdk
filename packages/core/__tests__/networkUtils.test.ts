import axios from 'axios';

import { httpRequest } from '../src/utils/networkUtils';

describe('networkUtils httpRequest retry bounds', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('keeps timeout, retries, and cancellation opt-in for existing callers', async () => {
    const requestSpy = jest.spyOn(axios, 'request').mockResolvedValue({
      status: 200,
      data: {
        ok: true,
      },
    });

    await expect(httpRequest('https://example.com/data.json', 'json')).resolves.toEqual({
      ok: true,
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0][0]).not.toHaveProperty('timeout');
    expect(requestSpy.mock.calls[0][0]).not.toHaveProperty('signal');
  });

  it('passes the per-attempt timeout and stops after the configured retry count', async () => {
    const timeoutError = Object.assign(new Error('timeout'), {
      code: 'ECONNABORTED',
      isAxiosError: true,
    });
    const requestSpy = jest.spyOn(axios, 'request').mockRejectedValue(timeoutError);

    await expect(
      httpRequest('https://example.com/firmware.bin', 'binary', {
        timeoutMs: 1234,
        maxRetries: 2,
        retryDelayMs: 0,
      })
    ).rejects.toBe(timeoutError);

    expect(requestSpy).toHaveBeenCalledTimes(3);
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        timeout: 1234,
      })
    );
  });

  it.each(['ECONNRESET', 'ENOTFOUND', 'ERR_NETWORK', 'ETIMEDOUT'])(
    'retries transient network error %s',
    async code => {
      const networkError = Object.assign(new Error('temporarily unreachable'), {
        code,
        isAxiosError: true,
      });
      const firmwareBinary = new ArrayBuffer(4);
      const requestSpy = jest
        .spyOn(axios, 'request')
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          status: 200,
          data: firmwareBinary,
        });

      await expect(
        httpRequest('https://example.com/firmware.bin', 'binary', {
          maxRetries: 1,
          retryDelayMs: 0,
        })
      ).resolves.toBe(firmwareBinary);

      expect(requestSpy).toHaveBeenCalledTimes(2);
    }
  );

  it('does not retry a canceled request', async () => {
    const canceledError = Object.assign(new Error('canceled'), {
      __CANCEL__: true,
      code: 'ERR_CANCELED',
      isAxiosError: true,
    });
    const requestSpy = jest.spyOn(axios, 'request').mockRejectedValue(canceledError);

    await expect(
      httpRequest('https://example.com/firmware.bin', 'binary', {
        maxRetries: 2,
        retryDelayMs: 0,
      })
    ).rejects.toBe(canceledError);

    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('enforces an overall deadline independently from the per-attempt timeout', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const requestSpy = jest.spyOn(axios, 'request').mockImplementation(
      () =>
        new Promise(() => {
          // Keep the request pending until the overall deadline aborts it.
        })
    );
    const requestPromise = httpRequest('https://example.com/firmware.bin', 'binary', {
      timeoutMs: 1_000,
      overallTimeoutMs: 2_500,
      maxRetries: 2,
      retryDelayMs: 0,
    });
    const rejection = expect(requestPromise).rejects.toMatchObject({
      name: 'HttpRequestOverallTimeoutError',
      message: expect.stringContaining('2500ms'),
    });

    jest.advanceTimersByTime(2_500);

    await rejection;
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0][0].signal?.aborted).toBe(true);
  });

  it('includes retry backoff in the overall deadline', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    const networkError = Object.assign(new Error('temporarily unreachable'), {
      code: 'ECONNRESET',
      isAxiosError: true,
    });
    const requestSpy = jest.spyOn(axios, 'request').mockRejectedValue(networkError);
    const requestPromise = httpRequest('https://example.com/firmware.bin', 'binary', {
      overallTimeoutMs: 2_500,
      maxRetries: 2,
      retryDelayMs: 5_000,
    });
    const rejection = expect(requestPromise).rejects.toMatchObject({
      name: 'HttpRequestOverallTimeoutError',
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(requestSpy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2_500);

    await rejection;
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it.each([500, 502, 503, 504])(
    'retries transient HTTP %s and returns the next response',
    async status => {
      const serverError = Object.assign(new Error('unavailable'), {
        isAxiosError: true,
        response: {
          status,
        },
      });
      const firmwareBinary = new ArrayBuffer(4);
      const requestSpy = jest
        .spyOn(axios, 'request')
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          status: 200,
          data: firmwareBinary,
        });

      await expect(
        httpRequest('https://example.com/firmware.bin', 'binary', {
          maxRetries: 1,
          retryDelayMs: 0,
        })
      ).resolves.toBe(firmwareBinary);

      expect(requestSpy).toHaveBeenCalledTimes(2);
    }
  );

  it.each([404, 501, 505])('does not retry HTTP %s', async status => {
    const responseError = Object.assign(new Error('request failed'), {
      isAxiosError: true,
      response: {
        status,
      },
    });
    const requestSpy = jest.spyOn(axios, 'request').mockRejectedValue(responseError);

    await expect(
      httpRequest('https://example.com/firmware.bin', 'binary', {
        maxRetries: 2,
        retryDelayMs: 0,
      })
    ).rejects.toBe(responseError);

    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it.each(['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID'])(
    'does not retry TLS/certificate error %s',
    async code => {
      const certificateError = Object.assign(new Error('certificate rejected'), {
        code,
        isAxiosError: true,
      });
      const requestSpy = jest.spyOn(axios, 'request').mockRejectedValue(certificateError);

      await expect(
        httpRequest('https://example.com/firmware.bin', 'binary', {
          maxRetries: 2,
          retryDelayMs: 0,
        })
      ).rejects.toBe(certificateError);

      expect(requestSpy).toHaveBeenCalledTimes(1);
    }
  );
});
