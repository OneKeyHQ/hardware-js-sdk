import React, { useState } from "react";
import { useDeviceStore } from "../../store/deviceStore";
import { useSDK } from "../../hooks/useSDK";
import { useToast } from "../../hooks/use-toast";
import {
  switchTransport,
  TransportType,
  searchDevices,
} from "../../services/hardwareService";
import { DeviceInfo } from "../../types/hardware";
import { Button } from "../ui/Button";
import { Monitor, Signal, ExternalLink, Info, Usb } from "lucide-react";

interface TransportSwitcherProps {
  className?: string;
}

const TransportSwitcher: React.FC<TransportSwitcherProps> = ({
  className = "",
}) => {
  const {
    transportType,
    setTransportType,
    setIsConnecting,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    sdkInitState,
  } = useDeviceStore();
  const { getSDKInstance } = useSDK();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const transportOptions: Array<{
    type: TransportType | "webble";
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    description?: string;
    needsBridge?: boolean;
  }> = [
    {
      type: "webusb",
      label: "WebUSB",
      icon: <Usb className="h-4 w-4" />,
      description: "推荐，直接连接",
    },
    {
      type: "jsbridge",
      label: "JSBridge",
      icon: <Monitor className="h-4 w-4" />,
      description: "稳定兼容",
      needsBridge: true,
    },
    {
      type: "webble",
      label: "WebBLE",
      icon: <Signal className="h-4 w-4" />,
      description: "蓝牙连接",
      disabled: true,
    },
  ];

  // Auto-connect logic for different connection types
  const handleDeviceConnection = async (devices: DeviceInfo[]) => {
    if (!devices.length) return;

    try {
      // 自动选择第一个设备进行连接
      const targetDevice = devices[0];
      setCurrentDevice(targetDevice);

      // 获取设备特征信息
      const sdk = await getSDKInstance();
      if (targetDevice.connectId && targetDevice.deviceId) {
        const featuresResult = await sdk.getFeatures(targetDevice.connectId);
        if (featuresResult.success && featuresResult.payload) {
          setDeviceFeatures(featuresResult.payload);
        }
      }
    } catch (error) {
      console.error("Auto connection error:", error);
    }
  };

  const handleTransportSwitch = async (newTransport: TransportType) => {
    // 检查SDK是否已初始化
    if (!sdkInitState.isInitialized) {
      toast({
        title: "SDK未就绪",
        description: "请等待SDK初始化完成后再切换传输方式",
        variant: "warning",
      });
      return;
    }

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setIsConnecting(true);

    try {
      // 先更新UI状态
      setTransportType(newTransport);

      // 切换传输方式
      const result = await switchTransport(newTransport);

      if (!result.success) {
        const errorMessage = result.payload?.error || "切换传输方式失败";
        toast({
          title: "连接失败",
          description: errorMessage,
          variant: "warning",
        });
        return;
      }

      // 搜索设备
      const searchResult = await searchDevices();

      if (searchResult.success && searchResult.payload) {
        const devices = searchResult.payload as DeviceInfo[];
        setConnectedDevices(devices);

        // 自动连接设备
        await handleDeviceConnection(devices);

        if (devices.length === 0) {
          toast({
            title: "未找到设备",
            description: "请确保设备已连接并解锁",
            variant: "warning",
          });
        }
      } else {
        const errorMessage = searchResult.payload?.error || "搜索设备失败";
        toast({
          title: "搜索失败",
          description: errorMessage,
          variant: "warning",
        });
        setConnectedDevices([]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "连接过程中发生未知错误";
      toast({
        title: "连接提示",
        description: errorMessage,
        variant: "warning",
      });
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
    }
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* 连接方式选择 */}
      <div className="space-y-3">
        {transportOptions.map((option) => (
          <div key={option.type} className="space-y-2">
            <Button
              onClick={() =>
                !option.disabled &&
                handleTransportSwitch(option.type as TransportType)
              }
              disabled={
                option.disabled || isLoading || !sdkInitState.isInitialized
              }
              variant="outline"
              size="sm"
              className={`w-full h-14 flex items-center justify-between px-5 py-4 transition-all duration-200 ${
                transportType === option.type
                  ? "bg-gray-900 hover:bg-gray-800 text-white border-gray-700 shadow-md ring-1 ring-gray-600"
                  : "bg-white hover:bg-gray-50 text-gray-900 border-gray-200 hover:border-gray-300"
              } ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`${
                    transportType === option.type
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                >
                  {option.icon}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{option.label}</div>
                  {option.description && (
                    <div
                      className={`text-xs ${
                        transportType === option.type
                          ? "text-gray-300"
                          : "text-gray-500"
                      }`}
                    >
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
              {option.disabled && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  即将推出
                </span>
              )}
            </Button>

            {/* JSBridge 下载提示 */}
            {option.type === "jsbridge" && option.needsBridge && (
              <div className="ml-8 flex items-center space-x-1.5 text-xs text-gray-500">
                <Info className="h-3 w-3" />
                <span>需要</span>
                <a
                  href="https://help.onekey.so/hc/zh-cn/articles/9740566472335-%E4%B8%8B%E8%BD%BD%E5%B9%B6%E6%9B%B4%E6%96%B0-OneKey-Bridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline decoration-1 underline-offset-2 inline-flex items-center space-x-1 transition-colors"
                >
                  <span>下载Bridge</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransportSwitcher;
