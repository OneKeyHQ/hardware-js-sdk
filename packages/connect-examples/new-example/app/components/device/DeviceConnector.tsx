import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeviceStore } from "../../store/deviceStore";
import { DeviceInfo } from "../../types/hardware";
import { searchDevices } from "../../services/hardwareService";
import { useSDK } from "../../hooks/useSDK";
import DeviceIcon from "./DeviceIcon";
import { isClassicModelDevice } from "../../utils/deviceTypeUtils";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Alert, AlertDescription } from "../ui/Alert";
import { Progress } from "../ui/Progress";
import { Separator } from "../ui/Separator";
import { AlertCircle, CheckCircle, Wifi, Monitor, Signal } from "lucide-react";
import { getDeviceType, getDeviceLabel } from "@onekeyfe/hd-core";

const DeviceConnector: React.FC = () => {
  const { t } = useTranslation();
  const {
    connectionType,
    setConnectionType,
    connectedDevices,
    currentDevice,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    isConnecting,
    setIsConnecting,
    sdkInitState,
  } = useDeviceStore();

  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState(0);
  const { getSDKInstance } = useSDK();

  const connectionMethods = [
    {
      type: "JSBridge",
      label: t("device.jsbridge"),
      icon: <Wifi className="h-5 w-5" />,
      description: "通过 Bridge 软件连接（推荐）",
      available: true,
      recommended: true,
    },
    {
      type: "WebUSB",
      label: t("device.webusb"),
      icon: <Monitor className="h-5 w-5" />,
      description: "通过 USB 直接连接",
      available: true,
      recommended: false,
    },
    {
      type: "WebBLE",
      label: t("device.bluetooth"),
      icon: <Signal className="h-5 w-5" />,
      description: "通过蓝牙连接（即将推出）",
      available: false,
      recommended: false,
    },
  ];

  const handleConnectionTypeChange = (type: string) => {
    setConnectionType(type);
    setError(null);
  };

  const handleSearch = async () => {
    // 严格检查 SDK 状态
    if (!sdkInitState.isInitialized || sdkInitState.isInitializing) {
      setError("请等待 SDK 初始化完成后再搜索设备");
      return;
    }

    if (!connectionType) {
      setError("请先选择连接方式");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchProgress(0);

    try {
      // 模拟搜索进度
      const progressInterval = setInterval(() => {
        setSearchProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      console.log("[DeviceConnector] 🔍 开始搜索设备");
      const result = await searchDevices();

      clearInterval(progressInterval);
      setSearchProgress(100);

      if (result.success) {
        const devices = (result.payload as DeviceInfo[]) || [];
        setConnectedDevices(devices);
        console.log(`[DeviceConnector] 🎯 找到 ${devices.length} 个设备`);

        if (devices.length === 0) {
          setError("未找到设备，请确保设备已连接");
        }
      } else {
        const errorMessage = result.payload?.error || "搜索设备失败";
        setError(errorMessage);
        console.error("[DeviceConnector] ❌ 搜索失败:", result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "搜索设备失败";
      setError(errorMessage);
      console.error("[DeviceConnector] 💥 搜索出错:", err);
    } finally {
      setIsSearching(false);
      setTimeout(() => setSearchProgress(0), 1000);
    }
  };

  const handleSelectDevice = async (device: DeviceInfo) => {
    setIsConnecting(true);
    setCurrentDevice(device);
    setError(null);

    try {
      console.log("[DeviceConnector] 🔗 连接设备:", device);
      const sdk = await getSDKInstance();
      const result = await sdk.getFeatures(device.connectId!);

      if (result.success) {
        const features = result.payload;
        setDeviceFeatures(features);

        // 从Features中获取正确的设备类型
        const actualDeviceType = getDeviceType(features);
        console.log("[DeviceConnector] 📋 设备类型检测结果:");
        console.log(`  - 搜索时设备类型: "${device.deviceType}"`);
        console.log(`  - Features检测类型: "${actualDeviceType}"`);

        // 更新设备信息，确保设备类型正确
        const updatedDevice: DeviceInfo = {
          ...device,
          deviceType: actualDeviceType,
          features: features as DeviceInfo["features"],
        };

        // 立即更新store中的设备信息
        setCurrentDevice(updatedDevice);

        console.log("[DeviceConnector] ✅ 设备连接成功并更新store:");
        console.log(`  - 最终设备类型: "${actualDeviceType}"`);
        console.log(`  - 更新后的设备信息:`, updatedDevice);
      } else {
        const errorMessage = result.payload?.error || "连接设备失败";
        setError(errorMessage);
        console.error("[DeviceConnector] ❌ 连接失败:", result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "连接设备失败";
      setError(errorMessage);
      console.error("[DeviceConnector] 💥 连接出错:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setCurrentDevice(null);
    setDeviceFeatures(undefined);
    setError(null);
  };

  // 判断搜索按钮是否应该禁用
  const isSearchDisabled =
    isSearching ||
    !connectionType ||
    !sdkInitState.isInitialized ||
    sdkInitState.isInitializing ||
    !!sdkInitState.error;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{t("deviceConnector.title")}</span>
            {currentDevice && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                已连接
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Methods */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-gray-900">
              {t("device.connectionMethod")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {connectionMethods.map((method) => (
                <Card
                  key={method.type}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    connectionType === method.type
                      ? "ring-2 ring-green-500 bg-green-50"
                      : "hover:bg-gray-50"
                  } ${
                    !method.available ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() =>
                    method.available && handleConnectionTypeChange(method.type)
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          connectionType === method.type
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            {method.label}
                          </span>
                          {method.recommended && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                              推荐
                            </Badge>
                          )}
                          {!method.available && (
                            <Badge variant="outline" className="text-xs">
                              即将推出
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <Separator />

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">设备搜索</h3>
              <Button
                onClick={handleSearch}
                disabled={isSearchDisabled}
                className="h-9"
              >
                {isSearching ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>搜索中...</span>
                  </div>
                ) : (
                  "搜索设备"
                )}
              </Button>
            </div>

            {/* Search Progress */}
            {isSearching && (
              <div className="space-y-2">
                <Progress value={searchProgress} className="h-2" />
                <p className="text-xs text-gray-500 text-center">
                  正在搜索 {connectionType} 设备...
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Device */}
          {currentDevice && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <DeviceIcon
                        deviceType={currentDevice.deviceType}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div>
                        <p className="font-medium text-green-800">
                          {getDeviceLabel(currentDevice.features)}
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          {currentDevice.label ||
                            currentDevice.name ||
                            "OneKey Device"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      className="border-green-300 hover:bg-green-100"
                    >
                      {t("deviceConnector.disconnect")}
                    </Button>
                  </div>

                  {/* 设备基本信息 */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-green-600 font-medium">
                          设备类型:
                        </span>
                        <span className="ml-2 text-green-700">
                          {currentDevice.deviceType}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">
                          设备ID:
                        </span>
                        <span className="ml-2 text-green-700 font-mono">
                          {currentDevice.deviceId}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">
                          连接ID:
                        </span>
                        <span className="ml-2 text-green-700 font-mono">
                          {currentDevice.connectId}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentDevice.features && (
                        <>
                          <div>
                            <span className="text-green-600 font-medium">
                              固件版本:
                            </span>
                            <span className="ml-2 text-green-700">
                              {currentDevice.features.major_version}.
                              {currentDevice.features.minor_version}.
                              {currentDevice.features.patch_version}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-600 font-medium">
                              序列号:
                            </span>
                            <span className="ml-2 text-green-700 font-mono">
                              {currentDevice.features.device_id || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-600 font-medium">
                              UUID:
                            </span>
                            <span className="ml-2 text-green-700 font-mono text-xs">
                              {currentDevice.uuid || "N/A"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 设备状态 */}
                  {currentDevice.features && (
                    <div className="pt-2 border-t border-green-200">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-300 text-xs"
                        >
                          {currentDevice.features.initialized
                            ? "已初始化"
                            : "未初始化"}
                        </Badge>
                        {currentDevice.features.pin_protection && (
                          <Badge
                            variant="outline"
                            className="bg-blue-100 text-blue-700 border-blue-300 text-xs"
                          >
                            PIN保护
                          </Badge>
                        )}
                        {currentDevice.features.passphrase_protection && (
                          <Badge
                            variant="outline"
                            className="bg-purple-100 text-purple-700 border-purple-300 text-xs"
                          >
                            passPhrase保护
                          </Badge>
                        )}
                        {isClassicModelDevice(currentDevice.deviceType) && (
                          <Badge
                            variant="outline"
                            className="bg-orange-100 text-orange-700 border-orange-300 text-xs"
                          >
                            支持网页输入
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Connected Devices List */}
          {connectedDevices.length > 0 && !currentDevice && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                找到的设备 ({connectedDevices.length})
              </h3>
              <div className="grid gap-3">
                {connectedDevices.map((device, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handleSelectDevice(device)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <DeviceIcon
                            deviceType={device.deviceType}
                            size="sm"
                            className="flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium">
                              {device.label ||
                                device.deviceType ||
                                "OneKey Device"}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {device.deviceType}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" disabled={isConnecting}>
                          {isConnecting ? "连接中..." : "连接"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceConnector;
