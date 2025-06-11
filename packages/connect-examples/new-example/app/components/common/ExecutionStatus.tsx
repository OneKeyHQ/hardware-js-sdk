import { Alert, AlertDescription } from "../ui/Alert";
import DeviceActionAnimation from "../ui/DeviceActionAnimation";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";
import type { DeviceModel, ThemeType } from "../ui/DeviceActionAnimation";

export type ExecutionStatus =
  | "idle"
  | "loading"
  | "device-interaction"
  | "success"
  | "error";

interface ExecutionStatusProps {
  status: ExecutionStatus;
  result?: unknown;
  error?: string | null;
  deviceModel?: DeviceModel;
  deviceTheme?: ThemeType;
  className?: string;
}

export function ExecutionStatus({
  status,
  result,
  error,
  deviceModel = "classic",
  deviceTheme = "light",
  className = "",
}: ExecutionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "loading":
        return {
          variant: "default" as const,
          icon: Clock,
          title: "正在执行...",
          description: "请等待方法执行完成",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "device-interaction":
        return {
          variant: "default" as const,
          icon: Clock,
          title: "设备交互",
          description: "请在设备上确认操作",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "success":
        return {
          variant: "default" as const,
          icon: CheckCircle,
          title: "执行成功",
          description: "方法已成功执行",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "error":
        return {
          variant: "warning" as const,
          icon: AlertTriangle,
          title: "执行失败",
          description: error || "执行过程中发生错误",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  if (!statusConfig || status === "idle") {
    return null;
  }

  const {
    icon: IconComponent,
    title,
    description,
    color,
    bgColor,
    borderColor,
  } = statusConfig;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 状态提示 */}
      <Alert className={`${bgColor} ${borderColor}`}>
        <IconComponent className={`h-4 w-4 ${color}`} />
        <AlertDescription>
          <div className={`font-medium ${color}`}>{title}</div>
          <div className={`text-sm mt-1 ${color}`}>{description}</div>
        </AlertDescription>
      </Alert>

      {/* 设备动画 */}
      {(status === "loading" || status === "device-interaction") && (
        <div className="flex justify-center">
          <DeviceActionAnimation
            deviceModel={deviceModel}
            action="confirm"
            theme={deviceTheme}
          />
        </div>
      )}

      {/* 成功结果显示 */}
      {status === "success" && result && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">执行结果：</h4>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {(() => {
                if (typeof result === "string") {
                  return result;
                }
                try {
                  return JSON.stringify(result, null, 2);
                } catch {
                  return String(result);
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
