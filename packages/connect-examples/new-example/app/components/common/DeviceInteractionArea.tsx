import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import DeviceActionAnimation from "../ui/DeviceActionAnimation";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Tablet,
  Play,
  RotateCcw,
} from "lucide-react";
import type { DeviceModel, ThemeType } from "../ui/DeviceActionAnimation";
import { UiEvent } from "@onekeyfe/hd-core";

type ExecutionStatus =
  | "idle"
  | "loading"
  | "device-interaction"
  | "success"
  | "error";

interface DeviceInteractionAreaProps {
  status: ExecutionStatus;
  deviceAction?: {
    actionType: UiEvent["type"];
    deviceInfo?: unknown;
  } | null;
  deviceModel: DeviceModel;
  deviceTheme: ThemeType;
  onExecute: () => void;
  onReset: () => void;
  isCancelling?: boolean;
}

const DeviceInteractionArea: React.FC<DeviceInteractionAreaProps> = ({
  status,
  deviceAction,
  deviceModel,
  deviceTheme,
  onExecute,
  onReset,
  isCancelling = false,
}) => {
  // 获取状态配置
  const getStatusConfig = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Clock className="h-5 w-5 animate-spin" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
          message: "正在执行...",
        };
      case "device-interaction":
        return {
          icon: <Clock className="h-5 w-5 animate-pulse" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          badgeColor: "bg-green-100 text-green-800 border-green-300",
          message: "请在设备上确认操作",
        };
      case "success":
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          badgeColor: "bg-green-100 text-green-800 border-green-300",
          message: "执行成功",
        };
      case "error":
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          badgeColor: "bg-red-100 text-red-800 border-red-300",
          message: "执行失败",
        };
      default:
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          color: "text-muted-foreground",
          bgColor: "bg-muted/20",
          borderColor: "border-border/50",
          badgeColor: "bg-muted text-muted-foreground border-border",
          message: "等待执行",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card className="bg-card border border-border/50 shadow-sm h-full flex flex-col">
      <CardHeader className="pb-1 flex-shrink-0">
        <CardTitle className="text-sm text-foreground flex items-center justify-between">
          期望的用户体验：
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col items-center justify-center h-full">
          {/* 设备展示区域 - 占用更多空间 */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 mb-6">
            {deviceAction ? (
              <div className="w-100 h-100">
                <DeviceActionAnimation
                  action={deviceAction.actionType}
                  deviceModel={deviceModel}
                  theme={deviceTheme}
                  loop={true}
                  autoplay={true}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-muted/20 rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center">
                <div className="w-28 h-28 bg-muted/30 rounded-full flex items-center justify-center mb-8 border border-border">
                  {status === "idle" ? (
                    <Tablet className="h-14 w-14 text-muted-foreground" />
                  ) : (
                    <div className={statusConfig.color}>
                      {statusConfig.icon}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {status === "idle"
                    ? "准备执行"
                    : status === "loading" || status === "device-interaction"
                    ? "设备响应中..."
                    : statusConfig.message}
                </p>
              </div>
            )}
          </div>

          {/* 执行控制按钮 - 并排布局，恢复文字 */}
          <div className="w-full grid grid-cols-2 gap-4 flex-shrink-0">
            <Button
              onClick={onExecute}
              disabled={status === "loading" || status === "device-interaction"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-sm flex items-center gap-2"
            >
              {status === "loading" || status === "device-interaction" ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>执行中</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>执行</span>
                </>
              )}
            </Button>

            {/* 取消按钮 */}
            <Button
              variant={
                status === "loading" || status === "device-interaction"
                  ? "elegant"
                  : "outline"
              }
              onClick={onReset}
              disabled={status === "idle" || status === "error" || isCancelling}
              className={
                status === "loading" || status === "device-interaction"
                  ? "h-11 text-sm flex items-center gap-2"
                  : "border-border text-foreground hover:bg-muted h-11 text-sm flex items-center gap-2"
              }
            >
              {isCancelling ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>取消中</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  <span>取消</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceInteractionArea;
