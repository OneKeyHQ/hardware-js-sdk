import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";
import { useDeviceStore } from "~/store/deviceStore";
import { callHardwareAPI } from "~/services/hardwareService";
import type { MethodConfig, ExecutionResult } from "~/data/types";

export interface UseMethodExecutionOptions {
  requireDevice?: boolean;
  basePath?: string;
}

export function useMethodExecution(options: UseMethodExecutionOptions = {}) {
  const { requireDevice = true, basePath = "" } = options;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentDevice } = useDeviceStore();

  const [selectedMethod, setSelectedMethod] = useState<MethodConfig | null>(
    null
  );
  const [isExecuting, setIsExecuting] = useState(false);

  const selectMethod = useCallback(
    (method: MethodConfig, chainId?: string) => {
      setSelectedMethod(method);
      const path = chainId
        ? `${basePath}/${chainId}/${method.method}`
        : `${basePath}/${method.method}`;
      navigate(path);
    },
    [navigate, basePath]
  );

  const executeMethod = useCallback(
    async (
      params: Record<string, unknown>,
      methodConfig?: MethodConfig
    ): Promise<ExecutionResult> => {
      const method = methodConfig || selectedMethod;

      if (!method) {
        throw new Error("未选择方法");
      }

      if (requireDevice && !currentDevice) {
        throw new Error("设备未连接");
      }

      setIsExecuting(true);
      const startTime = Date.now();

      try {
        const executionParams =
          requireDevice && currentDevice
            ? {
                connectId: currentDevice.connectId,
                deviceId: currentDevice.deviceId,
                ...params,
              }
            : params;

        const result = await callHardwareAPI(method.method, executionParams);
        const duration = Date.now() - startTime;

        if (result.success) {
          toast({
            title: "执行成功",
            description: `方法 ${method.name} 执行完成`,
          });

          return {
            success: true,
            data: result.payload,
            duration,
          };
        } else {
          throw new Error(result.payload?.error || "执行失败");
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : "执行失败";

        toast({
          title: "执行失败",
          description: errorMessage,
          variant: "warning",
        });

        return {
          success: false,
          error: errorMessage,
          duration,
        };
      } finally {
        setIsExecuting(false);
      }
    },
    [selectedMethod, currentDevice, requireDevice, toast]
  );

  const clearSelection = useCallback(() => {
    setSelectedMethod(null);
  }, []);

  return {
    selectedMethod,
    isExecuting,
    selectMethod,
    executeMethod,
    clearSelection,
    canExecute: !requireDevice || !!currentDevice,
  };
}
