import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { convertFilesToArrayBuffers } from '../store/hardwareStore';
import { cancelHardwareOperation } from '../services/hardwareService';
import { logRequest, logResponse } from '../utils/logger';
import type { ExecutionStatus } from '~/data/types';
import type { UiEvent } from '@onekeyfe/hd-core';
import { useFirmwareProgressStore } from '../components/providers/SDKProvider';

interface UseMethodExecutionOptions {
  type?: 'standard' | 'firmware';
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
}

interface UseMethodExecutionReturn {
  // 状态
  status: ExecutionStatus;
  isCancelling: boolean;

  // 设备交互状态
  deviceAction: {
    actionType: UiEvent['type'];
    deviceInfo?: unknown;
  } | null;

  // 操作
  execute: (
    params: Record<string, unknown>,
    handler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>
  ) => Promise<void>;
  cancel: (deviceConnectId?: string) => Promise<void>;
  reset: () => void;
  setDeviceAction: (action: { actionType: UiEvent['type']; deviceInfo?: unknown } | null) => void;
}

const MAX_LOG_STRING_LENGTH = 512;
const MAX_LOG_ARRAY_ITEMS = 40;

function formatByteSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function summarizeExecutionLogValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === undefined || value === null || typeof value !== 'object') {
    if (typeof value === 'string' && value.length > MAX_LOG_STRING_LENGTH) {
      return `${value.slice(0, MAX_LOG_STRING_LENGTH)}... (len=${value.length})`;
    }
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return `<ArrayBuffer ${formatByteSize(value.byteLength)}>`;
  }

  if (ArrayBuffer.isView(value)) {
    return `<${value.constructor.name} ${formatByteSize(value.byteLength)}>`;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const fileName = 'name' in value && typeof value.name === 'string' ? value.name : 'Blob';
    return `<${fileName} ${formatByteSize(value.size)}>`;
  }

  if (Array.isArray(value)) {
    const items = value.length > MAX_LOG_ARRAY_ITEMS ? value.slice(0, MAX_LOG_ARRAY_ITEMS) : value;
    const summarized = items.map(item => summarizeExecutionLogValue(item, depth + 1));
    return value.length > MAX_LOG_ARRAY_ITEMS
      ? [...summarized, `... (${value.length - MAX_LOG_ARRAY_ITEMS} more items)`]
      : summarized;
  }

  if (depth >= 6) {
    return '[Object]';
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      summarizeExecutionLogValue(item, depth + 1),
    ])
  );
}

function summarizeExecutionLogData(data: Record<string, unknown>) {
  return summarizeExecutionLogValue(data) as Record<string, unknown>;
}

export function useMethodExecution({
  type = 'standard',
  onResult,
  onError,
}: UseMethodExecutionOptions = {}): UseMethodExecutionReturn {
  const { toast } = useToast();

  // 固件进度重置函数
  const resetFirmwareProgressStore = useCallback(() => {
    if (type === 'firmware') {
      // 直接访问store而不是hook
      useFirmwareProgressStore.getState().reset();
    }
  }, [type]);

  // 状态管理
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [isCancelling, setIsCancelling] = useState(false);
  const [deviceAction, setDeviceAction] = useState<{
    actionType: UiEvent['type'];
    deviceInfo?: unknown;
  } | null>(null);

  // 执行方法
  const execute = useCallback(
    async (
      params: Record<string, unknown>,
      handler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>
    ) => {
      try {
        setStatus('loading');
        setIsCancelling(false);

        // 根据类型决定是否需要文件转换
        let executionParams: Record<string, unknown>;
        if (type === 'firmware') {
          executionParams = await convertFilesToArrayBuffers(params);
        } else {
          executionParams = params;
        }

        logRequest('Execution send data', summarizeExecutionLogData(executionParams));

        const startTime = Date.now();
        const result = await handler(executionParams);
        const duration = Date.now() - startTime;

        logResponse(
          'Execution receive data',
          summarizeExecutionLogValue(result) as Record<string, unknown>
        );

        // 检查执行结果（主要针对firmware类型）
        if (type === 'firmware' && result.success === false) {
          setStatus('error');
          onError?.(JSON.stringify(result));

          // 固件更新失败时也重置进度状态
          resetFirmwareProgressStore();

          toast({
            title: '执行失败',
            description: JSON.stringify(result),
            variant: 'destructive',
          });
          return;
        }

        // 执行成功
        setStatus('success');
        onResult?.(result);

        // 如果是固件更新，重置固件进度状态
        resetFirmwareProgressStore();

        toast({
          title: '执行成功',
          description: `方法执行完成 (${duration}ms)`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStatus('error');
        onError?.(errorMessage);

        // 如果是固件更新，执行异常时也重置进度状态
        resetFirmwareProgressStore();

        toast({
          title: '执行异常',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [type, onResult, onError, toast, resetFirmwareProgressStore]
  );

  // 取消操作
  const cancel = useCallback(
    async (deviceConnectId?: string) => {
      try {
        if (status !== 'loading' && status !== 'device-interaction') {
          return;
        }

        setIsCancelling(true);

        if (deviceConnectId) {
          const cancelResult = await cancelHardwareOperation(deviceConnectId);

          if (cancelResult.success) {
            setStatus('idle');
            setDeviceAction(null);
            setIsCancelling(false);

            // 如果是固件更新被取消，重置固件进度状态
            resetFirmwareProgressStore();

            toast({
              title: '操作已取消',
              description: '硬件操作已成功取消',
            });
          } else {
            console.warn('⚠️ [useMethodExecution] 取消操作失败:', cancelResult.payload);
            setIsCancelling(false);
          }
        } else {
          setStatus('idle');
          setDeviceAction(null);
          setIsCancelling(false);
        }
      } catch (error) {
        setIsCancelling(false);
        toast({
          title: '取消失败',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    },
    [status, toast, resetFirmwareProgressStore]
  );

  // 重置状态
  const reset = useCallback(() => {
    setStatus('idle');
    setDeviceAction(null);
    setIsCancelling(false);

    // 如果是固件更新，重置固件进度状态
    resetFirmwareProgressStore();

    toast({
      title: '状态重置',
      description: '已重置到初始状态',
    });
  }, [resetFirmwareProgressStore, toast]);

  return {
    // 状态
    status,
    isCancelling,
    deviceAction,

    // 操作
    execute,
    cancel,
    reset,
    setDeviceAction,
  };
}
