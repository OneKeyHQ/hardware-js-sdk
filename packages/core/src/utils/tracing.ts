/**
 * SDK Tracing Utilities
 * 用于追踪对象实例和请求调用链路
 *
 * 支持多个 SDK 实例，每个实例有独立的追踪上下文
 */

import { getLogger, LoggerNames } from './logger';

// ============================================================
// 全局计数器（跨 SDK 实例）
// ============================================================

const Log = getLogger(LoggerNames.Core);

let globalInstanceCounter = 0;
let sdkInstanceCounter = 0;

/**
 * 生成 SDK 实例 ID
 * @returns 格式: "SDK-<序号>-<时间戳>"
 * @example "SDK-1-123456"
 */
export function generateSdkInstanceId(): string {
  sdkInstanceCounter++;
  const timestamp = Date.now().toString().slice(-6);
  return `SDK-${sdkInstanceCounter}-${timestamp}`;
}

/**
 * 生成全局唯一的实例 ID
 * @param type 实例类型 (Device, DeviceCommands, BaseMethod, etc.)
 * @param sdkInstanceId SDK 实例 ID（可选，用于前缀）
 * @returns 格式: <SDK实例>.<类型>-<序号>-<时间戳>
 * @example "SDK-1.Device-1-123456" 或 "Device-1-123456"（无 SDK 实例）
 */
export function generateInstanceId(type: string, sdkInstanceId?: string): string {
  globalInstanceCounter++;
  const timestamp = Date.now().toString().slice(-6);
  const baseId = `${type}-${globalInstanceCounter}-${timestamp}`;
  return sdkInstanceId ? `${sdkInstanceId}.${baseId}` : baseId;
}

// ============================================================
// 请求上下文管理
// ============================================================

/**
 * 请求上下文信息
 */
export interface RequestContext {
  /** 请求唯一 ID (复用 BaseMethod.responseID) */
  responseID: number;
  /** SDK 实例 ID */
  sdkInstanceId?: string;
  /** API 方法名 */
  methodName: string;
  /** 设备连接 ID */
  connectId?: string;
  /** Device 实例 ID */
  deviceInstanceId?: string;
  /** DeviceCommands 实例 ID */
  commandsInstanceId?: string;
  /** 父请求 ID (用于嵌套调用如 allNetworkGetAddress) */
  parentResponseID?: number;
  /** 请求开始时间 */
  startTime: number;
  /** 请求结束时间 */
  endTime?: number;
  /** 请求状态 */
  status?: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  /** 错误信息 */
  error?: string;
}

/**
 * SDK 实例追踪上下文
 */
export interface SdkTracingContext {
  /** SDK 实例 ID */
  sdkInstanceId: string;
  /** 创建时间 */
  createdAt: number;
  /** 活跃请求 */
  activeRequests: Map<number, RequestContext>;
}

// 全局 SDK 实例追踪 Map
const sdkInstances = new Map<string, SdkTracingContext>();

// 全局请求 Map（跨 SDK 实例，用于快速查找）
const globalActiveRequests = new Map<number, RequestContext>();

/**
 * 创建 SDK 实例追踪上下文
 */
export function createSdkTracingContext(): SdkTracingContext {
  const sdkInstanceId = generateSdkInstanceId();
  const context: SdkTracingContext = {
    sdkInstanceId,
    createdAt: Date.now(),
    activeRequests: new Map(),
  };

  sdkInstances.set(sdkInstanceId, context);

  return context;
}

/**
 * 创建并注册请求上下文
 * @param responseID 请求 ID (复用 BaseMethod.responseID)
 * @param methodName API 方法名
 * @param options 额外选项
 */
export function createRequestContext(
  responseID: number,
  methodName: string,
  options?: {
    sdkInstanceId?: string;
    connectId?: string;
    deviceInstanceId?: string;
    commandsInstanceId?: string;
    parentResponseID?: number;
  }
): RequestContext {
  const context: RequestContext = {
    responseID,
    sdkInstanceId: options?.sdkInstanceId,
    methodName,
    connectId: options?.connectId,
    deviceInstanceId: options?.deviceInstanceId,
    commandsInstanceId: options?.commandsInstanceId,
    parentResponseID: options?.parentResponseID,
    startTime: Date.now(),
    status: 'pending',
  };

  // 注册到全局 Map
  globalActiveRequests.set(context.responseID, context);

  // 注册到 SDK 实例 Map
  if (options?.sdkInstanceId) {
    const sdkContext = sdkInstances.get(options.sdkInstanceId);
    if (sdkContext) {
      sdkContext.activeRequests.set(context.responseID, context);
    }
  }

  return context;
}

/**
 * 更新请求状态
 */
export function updateRequestContext(responseID: number, updates: Partial<RequestContext>): void {
  const context = globalActiveRequests.get(responseID);
  if (context) {
    Object.assign(context, updates);
  }
}

/**
 * 完成请求
 */
export function completeRequestContext(responseID: number, error?: Error): void {
  const context = globalActiveRequests.get(responseID);
  if (context) {
    context.endTime = Date.now();
    context.status = error ? 'error' : 'success';
    if (error) {
      context.error = error.message;
      // print core log
      Log.error(
        `[RequestContext] [completeRequestContext] Error: ${formatRequestContext(context)}`
      );
    }

    // 从活跃列表移除
    globalActiveRequests.delete(responseID);

    // 从 SDK 实例移除
    if (context.sdkInstanceId) {
      const sdkContext = sdkInstances.get(context.sdkInstanceId);
      if (sdkContext) {
        sdkContext.activeRequests.delete(responseID);
      }
    }
  }
}

// ============================================================
// 查询 API
// ============================================================

/**
 * 获取特定 Device 实例的活跃请求
 */
export function getActiveRequestsByDeviceInstance(deviceInstanceId: string): RequestContext[] {
  return Array.from(globalActiveRequests.values()).filter(
    ctx => ctx.deviceInstanceId === deviceInstanceId
  );
}

// ============================================================
// 格式化输出
// ============================================================

/**
 * 格式化请求上下文用于日志输出
 */
export function formatRequestContext(context: RequestContext): string {
  const duration = context.endTime
    ? context.endTime - context.startTime
    : Date.now() - context.startTime;

  const parts = [
    `[req:${context.responseID}]`,
    context.sdkInstanceId ? `sdk=${context.sdkInstanceId}` : null,
    `method=${context.methodName}`,
    context.connectId ? `connectId=${context.connectId}` : null,
    context.deviceInstanceId ? `deviceInst=${context.deviceInstanceId}` : null,
    context.commandsInstanceId ? `commandsInst=${context.commandsInstanceId}` : null,
    context.parentResponseID ? `parent=${context.parentResponseID}` : null,
    `duration=${duration}ms`,
    `status=${context.status}`,
    `error=${context.error}`,
  ].filter(Boolean);

  return parts.join(' ');
}

// ============================================================
// 清理和重置
// ============================================================

/**
 * 清理特定 SDK 实例
 */
export function cleanupSdkInstance(sdkInstanceId: string): void {
  const sdkContext = sdkInstances.get(sdkInstanceId);
  if (sdkContext) {
    // 从全局活跃请求中移除该 SDK 的请求
    for (const responseID of sdkContext.activeRequests.keys()) {
      globalActiveRequests.delete(responseID);
    }

    // 移除 SDK 实例
    sdkInstances.delete(sdkInstanceId);
  }
}
