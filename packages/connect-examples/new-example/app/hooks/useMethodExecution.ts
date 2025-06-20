import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { convertFilesToArrayBuffers } from '../utils/fileConverter';
import { cancelHardwareOperation } from '../services/hardwareService';
import type { ExecutionStatus } from '~/data/types';
import type { UiEvent } from '@onekeyfe/hd-core';

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

export function useMethodExecution({
  type = 'standard',
  onResult,
  onError,
}: UseMethodExecutionOptions = {}): UseMethodExecutionReturn {
  const { toast } = useToast();

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

        const startTime = Date.now();
        const result = await handler(executionParams);
        const duration = Date.now() - startTime;

        // 检查执行结果（主要针对firmware类型）
        if (type === 'firmware' && result.success === false) {
          setStatus('error');
          onError?.(JSON.stringify(result));

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

        toast({
          title: '执行成功',
          description: `方法执行完成 (${duration}ms)`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStatus('error');
        onError?.(errorMessage);

        toast({
          title: '执行异常',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [type, onResult, onError, toast]
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
    [status, toast]
  );

  // 重置状态
  const reset = useCallback(() => {
    setStatus('idle');
    setDeviceAction(null);
    setIsCancelling(false);

    toast({
      title: '状态重置',
      description: '已重置到初始状态',
    });
  }, [toast]);

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
