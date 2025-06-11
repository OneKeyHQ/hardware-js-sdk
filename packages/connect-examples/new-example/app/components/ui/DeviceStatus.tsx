import React from "react";
import { Card, CardContent } from "./Card";
import { DeviceIcon } from "../icons/DeviceIcon";
import { useDeviceStore } from "../../store/deviceStore";
import { Button } from "./Button";
import { X, Wifi, Monitor, Signal, CheckCircle } from "lucide-react";
import { Badge } from "./Badge";

export const DeviceStatus: React.FC = () => {
  const { currentDevice, setCurrentDevice, connectionType, transportType } =
    useDeviceStore();

  const handleDisconnect = () => {
    setCurrentDevice(null);
  };

  if (!currentDevice) {
    return (
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">未连接设备</p>
              <p className="text-xs text-gray-500">请选择连接方式并连接设备</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConnectionTypeDisplay = () => {
    // 使用 transportType (webusb, lowlevel) 或 fallback 到 connectionType
    const transport = transportType || connectionType;

    // 规范化传输类型字符串
    const normalizedTransport = transport.toLowerCase();

    if (normalizedTransport === "webusb") {
      return {
        label: "WebUSB",
        variant: "secondary" as const,
        icon: <Monitor className="h-4 w-4" />,
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    } else if (
      normalizedTransport === "lowlevel" ||
      normalizedTransport === "jsbridge"
    ) {
      return {
        label: "JSBridge",
        variant: "secondary" as const,
        icon: <Wifi className="h-4 w-4" />,
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    } else if (
      normalizedTransport === "webble" ||
      normalizedTransport === "ble"
    ) {
      return {
        label: "WebBLE",
        variant: "secondary" as const,
        icon: <Signal className="h-4 w-4" />,
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    } else {
      return {
        label: "未知",
        variant: "secondary" as const,
        icon: <Wifi className="h-4 w-4" />,
        className: "bg-gray-50 text-gray-700 border-gray-200",
      };
    }
  };

  const connectionDisplay = getConnectionTypeDisplay();

  // 设备类型显示名称映射
  const deviceTypeNames: Record<string, string> = {
    Classic: "OneKey Classic",
    Classic1s: "OneKey Classic 1S",
    Mini: "OneKey Mini",
    Touch: "OneKey Touch",
    Pro: "OneKey Pro",
    Unknown: "未知设备",
  };

  const displayName =
    deviceTypeNames[currentDevice.deviceType] ||
    currentDevice.deviceType ||
    "OneKey Device";
  const deviceLabel = currentDevice.label || currentDevice.name || "未命名设备";

  return (
    <Card className="bg-white border-gray-200 shadow-lg">
      <CardContent className="p-4">
        {/* Device Info Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                <DeviceIcon className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
                <CheckCircle className="w-2 h-2 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {displayName}
              </h3>
              <p className="text-xs text-gray-600 truncate">{deviceLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500 transition-all duration-200 text-gray-400 rounded-lg"
            title="断开连接"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection Type Badge */}
        <div className="mb-3">
          <Badge
            variant={connectionDisplay.variant}
            className={`gap-1.5 ${connectionDisplay.className}`}
          >
            {connectionDisplay.icon}
            <span>{connectionDisplay.label}</span>
          </Badge>
        </div>

        {/* Device Details */}
        <div className="space-y-2 text-xs">
          {/* Label 字段 */}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">标签:</span>
            <span
              className="text-gray-700 truncate ml-2 max-w-32 cursor-pointer hover:text-blue-600 transition-colors"
              title={currentDevice.label || "无标签"}
            >
              {currentDevice.label || "无标签"}
            </span>
          </div>

          {/* Name 字段 */}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">名称:</span>
            <span
              className="text-gray-700 truncate ml-2 max-w-32 cursor-pointer hover:text-blue-600 transition-colors"
              title={currentDevice.name || "无名称"}
            >
              {currentDevice.name || "无名称"}
            </span>
          </div>

          {/* DeviceType 字段 */}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">设备类型:</span>
            <span className="text-gray-700 truncate ml-2 max-w-32">
              {currentDevice.deviceType || "Unknown"}
            </span>
          </div>

          {/* DeviceId 字段 */}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">设备ID:</span>
            <span
              className="text-gray-700 font-mono truncate ml-2 max-w-32 cursor-pointer hover:text-blue-600 transition-colors"
              title={currentDevice.deviceId || "N/A"}
            >
              {currentDevice.deviceId
                ? currentDevice.deviceId.length > 8
                  ? `${currentDevice.deviceId.substring(
                      0,
                      6
                    )}...${currentDevice.deviceId.slice(-2)}`
                  : currentDevice.deviceId
                : "N/A"}
            </span>
          </div>

          {/* ConnectId 字段 */}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">连接ID:</span>
            <span
              className="text-gray-700 font-mono truncate ml-2 max-w-32 cursor-pointer hover:text-blue-600 transition-colors"
              title={currentDevice.connectId || "NULL"}
            >
              {currentDevice.connectId
                ? currentDevice.connectId.length > 8
                  ? `${currentDevice.connectId.substring(
                      0,
                      6
                    )}...${currentDevice.connectId.slice(-2)}`
                  : currentDevice.connectId
                : "NULL"}
            </span>
          </div>
        </div>

        {/* Status Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">
              设备已连接
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
