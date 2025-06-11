import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/Button";
import { useHardwareStore } from "~/store/hardwareStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/Dialog";
import { AlertTriangle } from "lucide-react";
import type { DeviceModel, ThemeType } from "../ui/DeviceActionAnimation";
import { useDeviceStore } from "../../store/deviceStore";
import { useToast } from "../../hooks/use-toast";
import type { MethodConfig, ExecutionStatus } from "~/data/types";
import { getSDKInstance } from "~/services/hardwareService";

// 导入子组件
import ParameterInput from "./ParameterInput";
import DeviceInteractionArea from "./DeviceInteractionArea";
import ExecutionPanel from "./ExecutionPanel";
import { LogEntry, LogType } from "./ExecutionLogger";
import { UiEvent } from "@onekeyfe/hd-core";

export interface MethodExecutorProps {
  methodConfig: MethodConfig;
  executionHandler: (
    params: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
}

const MethodExecutor: React.FC<MethodExecutorProps> = ({
  methodConfig,
  executionHandler,
  onResult,
  onError,
  className = "",
}) => {
  const { toast } = useToast();
  const {
    currentDevice,
    sdkInitState,
    deviceAction: globalDeviceAction,
  } = useDeviceStore();

  // 获取硬件状态管理器
  const {
    methodParameters,
    getExecutionParameters,
    setMethodParameters,
    resetMethodParameters,
  } = useHardwareStore();

  // 执行状态
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [localDeviceAction, setLocalDeviceAction] = useState<{
    actionType: UiEvent["type"];
    deviceInfo?: unknown;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);

  // 使用 useMemo 缓存 allParameters，避免无限渲染
  const allParameters = useMemo(() => {
    // 获取方法的所有参数，从预设中推断（因为新的 MethodConfig 没有 parameters 字段）
    if (!methodConfig.presets || methodConfig.presets.length === 0) {
      return [];
    }

    const parameterSet = new Set<string>();
    methodConfig.presets.forEach((preset) => {
      Object.keys(preset.value).forEach((key) => {
        parameterSet.add(key);
      });
    });

    return Array.from(parameterSet).map((name) => ({
      name,
      type: "string", // 默认类型
      required: false, // 默认非必需
      default: undefined, // 添加 default 属性
    }));
  }, [methodConfig.presets]);

  // 初始化参数值
  useEffect(() => {
    // 🔥 方法变化时，完全重置所有方法参数
    console.log("[MethodExecutor] 🔄 方法变化，重置参数:", methodConfig.method);
    resetMethodParameters();

    // 自动选择第一个预设
    if (methodConfig.presets && methodConfig.presets.length > 0) {
      const firstPreset = methodConfig.presets[0];
      setSelectedPreset(firstPreset.title);

      // 🔥 直接使用预设值，因为目前没有实际的默认值
      const presetParams = { ...firstPreset.value };

      console.log("[MethodExecutor] 📋 初始化参数:", {
        方法名称: methodConfig.method,
        预设参数: firstPreset.value,
        最终参数: presetParams,
      });

      setMethodParameters(presetParams);
    } else {
      setSelectedPreset(null);
      setMethodParameters({});

      console.log("[MethodExecutor] 📋 无预设，使用空参数:", {
        方法名称: methodConfig.method,
      });
    }
  }, [methodConfig, setMethodParameters, resetMethodParameters, allParameters]);

  // 监听全局设备动作状态
  useEffect(() => {
    if (globalDeviceAction.isActive && globalDeviceAction.actionType) {
      console.log(
        "🎯 [MethodExecutor] 设备交互开始:",
        globalDeviceAction.actionType
      );
      // 添加硬件交互日志
      addLog(
        "hardware",
        "设备交互开始",
        null,
        `等待设备操作: ${globalDeviceAction.actionType}`
      );

      setStatus("device-interaction");
      setLocalDeviceAction({
        actionType: globalDeviceAction.actionType,
        deviceInfo: globalDeviceAction.deviceInfo,
      });
    }
  }, [globalDeviceAction, status]);

  // 处理预设选择
  const handlePresetChange = (presetTitle: string) => {
    const preset = methodConfig.presets?.find((p) => p.title === presetTitle);
    if (preset) {
      setSelectedPreset(presetTitle);

      // 🔥 直接使用预设值，因为目前没有实际的默认值
      const newParams = { ...preset.value };

      console.log("[MethodExecutor] 🔄 切换预设:", {
        预设名称: presetTitle,
        预设参数: preset.value,
        最终参数: newParams,
      });

      setMethodParameters(newParams);
    }
  };

  // 验证参数
  const validateParams = (): boolean => {
    for (const param of allParameters) {
      if (param.required && !methodParameters[param.name]) {
        toast({
          title: "参数错误",
          description: `参数 "${param.name}" 是必需的`,
          variant: "warning",
        });
        return false;
      }
    }
    return true;
  };

  // 执行方法
  const executeMethod = async () => {
    if (!validateParams()) return;

    // 检查设备连接
    if (!currentDevice) {
      toast({
        title: "设备未连接",
        description: "请先连接硬件设备",
        variant: "warning",
      });
      return;
    }

    // 检查SDK状态
    if (!sdkInitState.isInitialized) {
      toast({
        title: "SDK未就绪",
        description: "请等待SDK初始化完成",
        variant: "warning",
      });
      return;
    }

    // 检查是否需要确认（仅对已弃用的方法显示警告）
    const needsConfirmation = methodConfig.deprecated;

    if (needsConfirmation) {
      setShowConfirmDialog(true);
      return;
    }

    await performExecution();
  };

  const performExecution = async () => {
    setStatus("loading");

    try {
      const startTime = Date.now();

      // 🔥 使用 hardwareStore 计算的最终执行参数
      const executionParams = getExecutionParameters();

      // 添加请求日志
      addLog(
        "request",
        `${methodConfig.method} 开始`,
        executionParams,
        `开始执行 ${methodConfig.method}`
      );

      console.log("[MethodExecutor] 🚀 执行参数:", executionParams);

      const execResult = await executionHandler(executionParams);
      const duration = Date.now() - startTime;

      setStatus("success");
      setLocalDeviceAction(null);

      toast({
        title: "执行成功",
        description: `${methodConfig.method} 执行完成 (${duration}ms)`,
      });

      onResult?.(execResult);

      // 添加日志条目
      addLog(
        "response",
        "执行成功",
        execResult,
        `${methodConfig.method} 执行完成 (${duration}ms)`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "执行失败";
      setStatus("error");
      setLocalDeviceAction(null);

      toast({
        title: "执行失败",
        description: errorMessage,
        variant: "warning",
      });

      onError?.(errorMessage);

      // 添加日志条目
      addLog("error", "执行失败", null, errorMessage);
    }
  };

  // 重置状态并取消硬件操作
  const handleReset = async () => {
    // 如果正在执行中或设备交互中，调用SDK的cancel方法
    if (status === "loading" || status === "device-interaction") {
      setIsCancelling(true);
      try {
        if (currentDevice) {
          console.log("[MethodExecutor] 🚫 取消硬件操作");

          const sdkInstance = await getSDKInstance();
          const cancelResult = await sdkInstance.deviceCancel(
            currentDevice.connectId,
            {}
          );

          if (cancelResult.success) {
            toast({
              title: "操作已取消",
              description: "硬件操作已成功取消",
            });
          } else {
            toast({
              title: "取消请求已发送",
              description: "正在尝试停止当前操作",
              variant: "default",
            });
          }
        }
      } catch (error) {
        console.warn("[MethodExecutor] ⚠️ 取消操作失败:", error);

        // 即使取消失败，也要继续重置UI状态
        toast({
          title: "取消请求已发送",
          description: "正在尝试停止当前操作",
          variant: "default",
        });
      } finally {
        setIsCancelling(false);
      }
    }

    // 重置UI状态
    setStatus("idle");

    // 清除日志
    clearLogs();
  };

  // 处理JSON编辑
  const handleRequestParamsEdit = (data: Record<string, unknown>) => {
    setMethodParameters(data);
  };

  // 根据设备信息获取设备型号
  const getDeviceModel = (): DeviceModel => {
    if (!currentDevice?.deviceType) {
      return "classic"; // 默认值
    }

    const deviceType = currentDevice.deviceType.toString().toLowerCase();
    if (deviceType.includes("classic")) return "classic";
    if (deviceType.includes("mini")) return "mini";
    if (deviceType.includes("pro")) return "pro";
    if (deviceType.includes("touch")) return "touch";
    return "classic"; // 默认值
  };

  // 获取设备主题
  const getDeviceTheme = (): ThemeType => {
    const deviceModel = getDeviceModel();
    if (deviceModel === "pro") {
      return "light";
    }
    return "light";
  };

  // 添加日志条目
  const addLog = (
    type: LogType,
    title: string,
    content?: string | Record<string, unknown> | null,
    description?: string
  ) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      title,
      content,
      description,
    };
    setExecutionLogs((prev) => [...prev, logEntry]);
  };

  // 清除日志
  const clearLogs = () => {
    setExecutionLogs([]);
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 紧凑的布局，充分利用空间 */}
      <div className="h-full flex flex-col space-y-3">
        {/* 上半部分：执行参数区域 - 自适应高度 */}
        <div className="flex-shrink-0">
          <ParameterInput
            methodConfig={methodConfig}
            selectedPreset={selectedPreset}
            onPresetChange={handlePresetChange}
          />
        </div>

        {/* 下半部分：主要内容区域 - 限制最大高度 */}
        <div className="flex-1 min-h-0 max-h-[650px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* 左侧：设备交互 - 固定宽度 */}
            <div className="lg:col-span-4 flex flex-col">
              <DeviceInteractionArea
                status={status}
                deviceAction={localDeviceAction}
                deviceModel={getDeviceModel()}
                deviceTheme={getDeviceTheme()}
                onExecute={executeMethod}
                onReset={handleReset}
                isCancelling={isCancelling}
              />
            </div>

            {/* 右侧：执行面板（请求参数 + 执行日志） - 填充剩余空间 */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <ExecutionPanel
                requestData={getExecutionParameters()}
                onSaveRequest={handleRequestParamsEdit}
                logs={executionLogs}
                onClearLogs={clearLogs}
                disabled={
                  status === "loading" || status === "device-interaction"
                }
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>确认执行</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {methodConfig.deprecated
                ? "这是一个已弃用的方法，可能会影响设备安全。请确认您了解此操作的风险。"
                : "请确认您要执行此操作。"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              操作：
              <span className="font-medium text-foreground">
                {methodConfig.method}
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {methodConfig.description}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              取消
            </Button>
            <Button
              onClick={performExecution}
              variant={methodConfig.deprecated ? "warning" : "default"}
              className={
                methodConfig.deprecated
                  ? ""
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MethodExecutor;
