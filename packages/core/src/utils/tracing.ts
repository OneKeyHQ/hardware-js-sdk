/**
 * SDK Tracing Utilities
 * Tracks object instances and request call chains across multiple SDK instances
 */

import { getLogger, LoggerNames } from './logger';

// Global counters (cross-SDK instances)

const Log = getLogger(LoggerNames.Core);

let globalInstanceCounter = 0;
let sdkInstanceCounter = 0;

/**
 * Generate SDK instance ID
 * @returns Format: "SDK-<number>-<timestamp>"
 * @example "SDK-1-123456"
 */
export function generateSdkInstanceId(): string {
  sdkInstanceCounter++;
  const timestamp = Date.now().toString().slice(-6);
  return `SDK-${sdkInstanceCounter}-${timestamp}`;
}

/**
 * Generate globally unique instance ID
 * @param type Instance type (Device, DeviceCommands, BaseMethod, etc.)
 * @param sdkInstanceId SDK instance ID (optional)
 * @returns Format: <SDK>.<type>-<number>-<timestamp>
 * @example "SDK-1.Device-1-123456" or "Device-1-123456"
 */
export function generateInstanceId(type: string, sdkInstanceId?: string): string {
  globalInstanceCounter++;
  const timestamp = Date.now().toString().slice(-6);
  const baseId = `${type}-${globalInstanceCounter}-${timestamp}`;
  return sdkInstanceId ? `${sdkInstanceId}.${baseId}` : baseId;
}

// Request context management

/**
 * Request context information
 */
export interface RequestContext {
  /** Request unique ID (reuses BaseMethod.responseID) */
  responseID: number;
  /** SDK instance ID */
  sdkInstanceId?: string;
  /** API method name */
  methodName: string;
  /** Device connection ID */
  connectId?: string;
  /** Device instance ID */
  deviceInstanceId?: string;
  /** DeviceCommands instance ID */
  commandsInstanceId?: string;
  /** Parent request ID (for nested calls like allNetworkGetAddress) */
  parentResponseID?: number;
  /** Request start time */
  startTime: number;
  /** Request end time */
  endTime?: number;
  /** Request status */
  status?: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  /** Error message */
  error?: string;
}

/**
 * SDK instance tracing context
 */
export interface SdkTracingContext {
  /** SDK instance ID */
  sdkInstanceId: string;
  /** Creation timestamp */
  createdAt: number;
  /** Active requests */
  activeRequests: Map<number, RequestContext>;
}

// Global SDK instance tracking map
const sdkInstances = new Map<string, SdkTracingContext>();

// Global request map (cross-SDK instances for quick lookup)
const globalActiveRequests = new Map<number, RequestContext>();

/**
 * Create SDK instance tracing context
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
 * Create and register request context
 * @param responseID Request ID (reuses BaseMethod.responseID)
 * @param methodName API method name
 * @param options Additional options
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

  // Register to global map
  globalActiveRequests.set(context.responseID, context);

  // Register to SDK instance map
  if (options?.sdkInstanceId) {
    const sdkContext = sdkInstances.get(options.sdkInstanceId);
    if (sdkContext) {
      sdkContext.activeRequests.set(context.responseID, context);
    }
  }

  return context;
}

/**
 * Update request context
 */
export function updateRequestContext(responseID: number, updates: Partial<RequestContext>): void {
  const context = globalActiveRequests.get(responseID);
  if (context) {
    Object.assign(context, updates);
  }
}

/**
 * Complete request context
 */
export function completeRequestContext(responseID: number, error?: Error): void {
  const context = globalActiveRequests.get(responseID);
  if (context) {
    context.endTime = Date.now();
    context.status = error ? 'error' : 'success';
    if (error) {
      context.error = error.message;
      Log.error(
        `[RequestContext] [completeRequestContext] Error: ${formatRequestContext(context)}`
      );
    }

    // Remove from active list
    globalActiveRequests.delete(responseID);

    // Remove from SDK instance
    if (context.sdkInstanceId) {
      const sdkContext = sdkInstances.get(context.sdkInstanceId);
      if (sdkContext) {
        sdkContext.activeRequests.delete(responseID);
      }
    }
  }
}

// Query API

/**
 * Get active requests for specific Device instance
 */
export function getActiveRequestsByDeviceInstance(deviceInstanceId: string): RequestContext[] {
  return Array.from(globalActiveRequests.values()).filter(
    ctx => ctx.deviceInstanceId === deviceInstanceId
  );
}

// Format output

/**
 * Format request context for logging
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

// Cleanup and reset

/**
 * Cleanup specific SDK instance
 */
export function cleanupSdkInstance(sdkInstanceId: string): void {
  const sdkContext = sdkInstances.get(sdkInstanceId);
  if (sdkContext) {
    // Remove SDK requests from global active requests
    for (const responseID of sdkContext.activeRequests.keys()) {
      globalActiveRequests.delete(responseID);
    }

    // Remove SDK instance
    sdkInstances.delete(sdkInstanceId);
  }
}
