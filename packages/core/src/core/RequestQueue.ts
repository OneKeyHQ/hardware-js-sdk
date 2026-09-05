import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { LoggerNames, getLogger } from '../utils';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { BaseMethod } from '../api/BaseMethod';

const Log = getLogger(LoggerNames.Core);
export type RequestTask = {
  id: number;
  method: BaseMethod;
  callPromise?: Deferred<any> | undefined;
  abortController?: AbortController;
};

export default class RequestQueue {
  private requestQueue = new Map<number, RequestTask>();

  private pendingCallbackTasks = new Map<string, Deferred<void>>();

  // 生成唯一请求ID
  public generateRequestId = (method?: BaseMethod) => {
    if (method && method.responseID != null) {
      return method.responseID;
    }
    return Date.now();
  };

  public createTask(method: BaseMethod): RequestTask {
    const requestId = this.generateRequestId(method);
    if (method && method.responseID !== requestId) {
      method.responseID = requestId;
    }
    const abortController = new AbortController();
    method.abortSignal = abortController.signal;
    const task = { id: requestId, method, abortController };
    this.requestQueue.set(requestId, task);
    return task;
  }

  public getTask(requestId: number): RequestTask | undefined {
    return this.requestQueue.get(requestId);
  }

  public async waitForTask<T>(task: RequestTask, pending: () => Promise<T>): Promise<T> {
    const signal = task.method.abortSignal;
    const cancellationError = () => ERRORS.TypedError(HardwareErrorCode.CallQueueActionCancelled);
    if (signal?.aborted) throw cancellationError();
    let onAbort: (() => void) | undefined;
    try {
      const cancelled = new Promise<never>((_, reject) => {
        onAbort = () => reject(cancellationError());
        signal?.addEventListener('abort', onAbort, { once: true });
      });
      const result = await Promise.race([pending(), cancelled]);
      if (signal?.aborted) throw cancellationError();
      return result;
    } finally {
      if (onAbort) signal?.removeEventListener('abort', onAbort);
    }
  }

  // 获取请求的AbortController
  public getAbortController(requestId: number) {
    return this.requestQueue.get(requestId)?.abortController;
  }

  // 取消特定请求
  public abortRequest(requestId: number) {
    const request = this.requestQueue.get(requestId);
    if (request?.abortController) {
      Log.debug(`Aborting request ${requestId}`);
      request.abortController.abort();
      return true;
    }
    return false;
  }

  private isRequestForConnectId(request: RequestTask, connectId: string) {
    const { method } = request;
    return (
      method.connectId === connectId ||
      method.device?.mainId === connectId ||
      method.device?.getConnectId() === connectId
    );
  }

  // 取消与指定connectId相关的所有请求
  public abortRequestsByConnectId(connectId: string) {
    let count = 0;
    this.requestQueue.forEach((request, _) => {
      if (request.abortController && this.isRequestForConnectId(request, connectId)) {
        request.abortController.abort();
        request.abortController = undefined;
        count++;
      }
    });
    return count;
  }

  public getRequestTasksIdByConnectId(connectId: string) {
    return Array.from(this.requestQueue.values())
      .filter(request => this.isRequestForConnectId(request, connectId))
      .map(request => request.id);
  }

  // 取消所有请求
  public abortAllRequests() {
    let count = 0;
    this.requestQueue.forEach(request => {
      if (request.abortController) {
        request.abortController.abort();
        count++;
      }
    });
    return count;
  }

  // 迭代所有请求
  public getRequestTasksId() {
    return Array.from(this.requestQueue.keys());
  }

  // 解析请求
  public resolveRequest(requestId: number, response: any) {
    const request = this.requestQueue.get(requestId);
    if (request) {
      request.callPromise?.resolve(response);
    }
    this.releaseTask(requestId);
  }

  // 拒绝请求
  public rejectRequest(requestId: number, error: any) {
    const request = this.requestQueue.get(requestId);
    if (request) {
      request.callPromise?.reject(error);
    }
    this.releaseTask(requestId);
  }

  // 删除请求
  public releaseTask(requestId: number) {
    this.requestQueue.delete(requestId);
  }

  public registerPendingCallbackTask(connectId: string, callbackPromise: Deferred<void>) {
    this.pendingCallbackTasks.set(connectId, callbackPromise);

    callbackPromise.promise.finally(() => {
      Log.debug(`Callback task completed for connectId: ${connectId}`);
      // Delete by identity so a newer task that replaced this slot isn't orphaned.
      if (this.pendingCallbackTasks.get(connectId) === callbackPromise) {
        this.pendingCallbackTasks.delete(connectId);
      }
    });
  }

  public async waitForPendingCallbackTasks(
    connectId: string,
    exceptTask?: Deferred<void>
  ): Promise<void> {
    const pendingTask = this.pendingCallbackTasks.get(connectId);
    // Skip only the caller's own task (self-wait); a different one is still awaited.
    if (pendingTask && pendingTask !== exceptTask) {
      Log.debug(`Waiting for pending callback task to complete for connectId: ${connectId}`);
      await pendingTask.promise;
    }
  }

  public cancelCallbackTasks(connectId: string) {
    const pendingTask = this.pendingCallbackTasks.get(connectId);
    if (pendingTask) {
      pendingTask.resolve();
    }
  }
}
