import RequestQueue from '../src/core/RequestQueue';

import type { BaseMethod } from '../src/api/BaseMethod';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

function buildMethod(responseID: number, operationId?: string) {
  return {
    payload: { operationId },
    responseID,
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
});
