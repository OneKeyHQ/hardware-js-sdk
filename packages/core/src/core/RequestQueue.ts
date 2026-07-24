import { type Deferred, createDeferred } from '@onekeyfe/hd-shared';

import { LoggerNames, getLogger } from '../utils';

import type { BaseMethod } from '../api/BaseMethod';

const Log = getLogger(LoggerNames.Core);
const OPERATION_PRE_CANCEL_TTL_MS = 30_000;
const DEFAULT_BACKGROUND_PREEMPT_TIMEOUT_MS = 5_500;

export type RequestTask = {
  id: number;
  method: BaseMethod;
  callPromise?: Deferred<any> | undefined;
  abortController?: AbortController;
  settled: Deferred<void>;
};

export type RequestAdmission =
  | { status: 'reserved'; task: RequestTask }
  | { status: 'busy'; blockingTask?: RequestTask };

export type RequestAdmissionOptions = {
  backgroundPreemptTimeoutMs?: number;
};

export default class RequestQueue {
  private requestQueue = new Map<number, RequestTask>();

  private operationRequestIds = new Map<string, number>();

  private pendingOperationCancellations = new Map<string, number>();

  private pendingCallbackTasks = new Map<string, Deferred<void>>();

  private prunePendingOperationCancellations(now = Date.now()) {
    this.pendingOperationCancellations.forEach((expiresAt, operationId) => {
      if (expiresAt <= now) {
        this.pendingOperationCancellations.delete(operationId);
      }
    });
  }

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
    const task = {
      id: requestId,
      method,
      abortController,
      settled: createDeferred<void>(),
    };
    this.requestQueue.set(requestId, task);
    const operationId = method.payload?.operationId;
    if (typeof operationId === 'string' && operationId) {
      this.operationRequestIds.set(operationId, requestId);
      this.prunePendingOperationCancellations();
      if (this.pendingOperationCancellations.delete(operationId)) {
        abortController.abort();
      }
    }
    return task;
  }

  public async admitTask(
    method: BaseMethod,
    options: RequestAdmissionOptions = {}
  ): Promise<RequestAdmission> {
    const activeTasks = Array.from(this.requestQueue.values()).filter(
      task => task.method.connectId === method.connectId
    );

    if (method.executionPriority === 'background') {
      if (activeTasks.length) {
        Log.debug(
          `Reject background method ${method.name}: device is occupied by ${activeTasks[0].method.name}`
        );
        return { status: 'busy', blockingTask: activeTasks[0] };
      }
      return { status: 'reserved', task: this.createTask(method) };
    }

    const backgroundTasks = activeTasks.filter(
      task => task.method.executionPriority === 'background'
    );
    if (!backgroundTasks.length) {
      return { status: 'reserved', task: this.createTask(method) };
    }

    Log.debug(
      `Preempt ${backgroundTasks.length} background request(s) for user method ${method.name}`
    );
    backgroundTasks.forEach(task => task.abortController?.abort());
    const timeoutMs = options.backgroundPreemptTimeoutMs ?? DEFAULT_BACKGROUND_PREEMPT_TIMEOUT_MS;
    const released = await this.waitForTasksReleased(backgroundTasks, timeoutMs);
    if (!released) {
      Log.warn(`Background request cleanup timed out before user method ${method.name}`);
      return { status: 'busy', blockingTask: backgroundTasks[0] };
    }

    return { status: 'reserved', task: this.createTask(method) };
  }

  private async waitForTasksReleased(tasks: RequestTask[], timeoutMs: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<false>(resolve => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const releasedPromise = Promise.all(tasks.map(task => task.settled.promise)).then(() => true);
    const released = await Promise.race([releasedPromise, timeoutPromise]);
    if (timer) {
      clearTimeout(timer);
    }
    return released;
  }

  public abortOperation(operationId: string) {
    const requestId = this.operationRequestIds.get(operationId);
    if (requestId !== undefined) {
      return this.abortRequest(requestId);
    }
    const now = Date.now();
    this.prunePendingOperationCancellations(now);
    this.pendingOperationCancellations.set(operationId, now + OPERATION_PRE_CANCEL_TTL_MS);
    return false;
  }

  public getTask(requestId: number): RequestTask | undefined {
    return this.requestQueue.get(requestId);
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

  // 取消与指定connectId相关的所有请求
  public abortRequestsByConnectId(connectId: string) {
    let count = 0;
    this.requestQueue.forEach((request, _) => {
      if (request.abortController && request.method.connectId === connectId) {
        request.abortController.abort();
        request.abortController = undefined;
        count++;
      }
    });
    return count;
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
    this.pendingOperationCancellations.clear();
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
    const task = this.requestQueue.get(requestId);
    const operationId = task?.method.payload?.operationId;
    if (
      typeof operationId === 'string' &&
      this.operationRequestIds.get(operationId) === requestId
    ) {
      this.operationRequestIds.delete(operationId);
    }
    task?.settled.resolve();
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
