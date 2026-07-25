import RequestQueue from '../src/core/RequestQueue';

import type { BaseMethod } from '../src/api/BaseMethod';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

function buildMethod(responseID: number, operationId?: string) {
  return {
    connectId: 'device-1',
    executionPriority: 'normal',
    payload: { operationId },
    responseID,
  } as unknown as BaseMethod;
}

function buildBackgroundMethod(responseID: number, operationId?: string) {
  return {
    ...buildMethod(responseID, operationId),
    executionPriority: 'background',
  } as unknown as BaseMethod;
}

describe('RequestQueue operation cancellation', () => {
  test('aborts only the request matching the operation id', () => {
    const queue = new RequestQueue();
    const portfolio = queue.createTask(buildMethod(1, 'portfolio-1'));
    const userAction = queue.createTask(buildMethod(2, 'user-action'));

    expect(queue.abortOperation('portfolio-1')).toBe(true);
    expect(portfolio.abortController?.signal.aborted).toBe(true);
    expect(userAction.abortController?.signal.aborted).toBe(false);
  });

  test('returns false for an unknown operation id', () => {
    const queue = new RequestQueue();
    queue.createTask(buildMethod(1, 'portfolio-1'));

    expect(queue.abortOperation('missing')).toBe(false);
  });

  test('honors cancellation that arrives before the request is registered', () => {
    const queue = new RequestQueue();

    expect(queue.abortOperation('portfolio-1')).toBe(false);

    const portfolio = queue.createTask(buildMethod(1, 'portfolio-1'));
    const userAction = queue.createTask(buildMethod(2, 'user-action'));

    expect(portfolio.abortController?.signal.aborted).toBe(true);
    expect(userAction.abortController?.signal.aborted).toBe(false);
  });

  test('expires a cancellation that is never matched', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000);
    const queue = new RequestQueue();
    queue.abortOperation('portfolio-1');
    nowSpy.mockReturnValue(31_001);

    const portfolio = queue.createTask(buildMethod(1, 'portfolio-1'));

    expect(portfolio.abortController?.signal.aborted).toBe(false);
    nowSpy.mockRestore();
  });

  test('rejects a background request while the device has an active user request', async () => {
    const queue = new RequestQueue();
    queue.createTask(buildMethod(1, 'user-action'));

    await expect(
      queue.admitTask(buildBackgroundMethod(2, 'portfolio-1'), {
        backgroundPreemptTimeoutMs: 100,
      })
    ).resolves.toMatchObject({ status: 'busy' });
    expect(queue.getTask(2)).toBeUndefined();
  });

  test('aborts and waits for an active background request before admitting a user request', async () => {
    const queue = new RequestQueue();
    const portfolio = queue.createTask(buildBackgroundMethod(1, 'portfolio-1'));

    const admission = queue.admitTask(buildMethod(2, 'user-action'), {
      backgroundPreemptTimeoutMs: 100,
    });
    await Promise.resolve();

    expect(portfolio.abortController?.signal.aborted).toBe(true);
    expect(queue.getTask(2)).toBeUndefined();

    portfolio.settled.resolve();
    await Promise.resolve();
    expect(queue.getTask(2)).toBeUndefined();

    queue.releaseTask(1);

    await expect(admission).resolves.toMatchObject({
      status: 'reserved',
      task: { id: 2 },
    });
  });

  test('uses the background method abort latency when no admission override is provided', async () => {
    const queue = new RequestQueue();
    const portfolio = queue.createTask(buildBackgroundMethod(1, 'portfolio-1'));
    portfolio.method.maxAbortLatencyMs = 12_000;
    const waitForTasksReleased = jest
      .spyOn(queue as any, 'waitForTasksReleased')
      .mockResolvedValue(false);

    await expect(queue.admitTask(buildMethod(2, 'user-action'))).resolves.toMatchObject({
      status: 'busy',
    });
    expect(waitForTasksReleased).toHaveBeenCalledWith([portfolio], 12_000);
  });

  test('returns busy when an aborted background request does not release in time', async () => {
    const queue = new RequestQueue();
    const portfolio = queue.createTask(buildBackgroundMethod(1, 'portfolio-1'));

    await expect(
      queue.admitTask(buildMethod(2, 'user-action'), {
        backgroundPreemptTimeoutMs: 1,
      })
    ).resolves.toMatchObject({
      status: 'busy',
      blockingTask: { id: 1 },
    });
    expect(portfolio.abortController?.signal.aborted).toBe(true);
    expect(queue.getTask(2)).toBeUndefined();

    queue.releaseTask(1);
    await expect(queue.admitTask(buildMethod(3, 'user-retry'))).resolves.toMatchObject({
      status: 'reserved',
      task: { id: 3 },
    });
  });
});
