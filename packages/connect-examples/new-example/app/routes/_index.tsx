import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "react-i18next";
import { useDeviceStore } from "../store/deviceStore";
import { CheckCircle, XCircle, Usb, Wifi } from "lucide-react";
import TransportSwitcher from "../components/common/TransportSwitcher";
import DeviceIcon from "../components/device/DeviceIcon";
import deviceList from "../assets/device-list2.png";
export default function IndexPage() {
  const { t } = useTranslation();
  const {
    transportType,
    currentDevice,
    getCurrentDeviceLabel,
    isCurrentDeviceClassicModel,
    isConnecting,
  } = useDeviceStore();

  const getTransportIcon = () => {
    switch (transportType) {
      case "webusb":
        return <Usb className="h-4 w-4 text-primary" />;
      case "jsbridge":
        return <Wifi className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const deviceDisplayName = currentDevice ? getCurrentDeviceLabel() : "";

  return (
    <div className="min-h-screen bg-background flex justify-center pt-16 p-6">
      <div className="container max-w-7xl mx-auto">
        {/* 主标题区域 - 紧凑设计 */}
        <div className="text-center space-y-3 mb-20">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            OneKey Hardware Wallet SDK
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("home.subtitle")}
          </p>
        </div>

        {/* 主要内容区域 - 等高布局 */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-12">
          {/* 左侧：设备连接控制 */}
          <div className="lg:col-span-1">
            <Card className="bg-card border border-border/50 shadow-sm h-full relative">
              {/* 卡片右上角加载指示器 */}
              {isConnecting && (
                <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-600">连接中</span>
                  </div>
                </div>
              )}

              <CardContent className="p-8 h-full flex flex-col">
                <div className="space-y-8 flex-1">
                  {/* 连接状态 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentDevice ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <h3 className="font-semibold text-base text-foreground">
                            {currentDevice
                              ? t("device.connected")
                              : t("device.disconnected")}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getTransportIcon()}
                            <p className="text-xs text-muted-foreground">
                              {transportType || t("device.notSelected")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 连接方式选择 */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-base text-foreground">
                      {t("device.selectConnection")}
                    </h4>
                    <TransportSwitcher />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：设备详细信息展示 */}
          <div className="lg:col-span-2">
            {currentDevice ? (
              /* 已连接设备的详细信息 */
              <Card className="bg-card border border-border/50 shadow-sm h-full">
                <CardContent className="p-8 h-full flex flex-col">
                  {/* 设备主要信息 */}
                  <div className="flex items-center gap-8 mb-8">
                    <div className="flex-shrink-0">
                      <DeviceIcon
                        deviceType={currentDevice.deviceType}
                        size="xl"
                        className="drop-shadow-lg"
                      />
                    </div>
                    <div className="flex-1 space-y-4">
                      {/* 设备名称和状态 */}
                      <div className="space-y-2">
                        <h2 className="text-3xl font-light text-foreground">
                          {deviceDisplayName}
                        </h2>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            通过 {transportType} 连接
                          </span>
                        </div>
                      </div>

                      {/* 关键信息网格 */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">
                            设备类型
                          </div>
                          <div className="text-sm font-medium">
                            {currentDevice.deviceType}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">
                            连接ID
                          </div>
                          <div className="text-sm font-mono">
                            {currentDevice.connectId}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-border/50 mb-6"></div>

                  {/* 设备信息 - 剩余空间填充 */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-4 text-foreground">
                      设备信息
                    </h3>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          UUID
                        </span>
                        <span className="text-xs font-mono">
                          {currentDevice.uuid || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          deviceId
                        </span>
                        <span className="text-sm font-mono">
                          {currentDevice.deviceId}
                        </span>
                      </div>
                      {currentDevice.features && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              固件版本
                            </span>
                            <span className="text-sm">
                              {currentDevice.features.onekey_firmware_version}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              蓝牙版本
                            </span>
                            <span className="text-sm">
                              {currentDevice.features.onekey_ble_version ||
                                currentDevice.features.ble_ver ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Boot版本
                            </span>
                            <span className="text-sm">
                              {currentDevice.features.onekey_boot_version ||
                                "N/A"}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          网页输入pin
                        </span>
                        <Badge
                          variant={
                            isCurrentDeviceClassicModel()
                              ? "default"
                              : "secondary"
                          }
                        >
                          {isCurrentDeviceClassicModel() ? "支持" : "不支持"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* 未连接设备时显示设备列表图片 */
              <Card className="bg-card border border-border/50 shadow-sm h-full">
                <CardContent className="p-8 h-full flex flex-col items-center justify-center">
                  <div className="relative flex-1 flex items-center justify-center">
                    <img
                      src={deviceList}
                      alt="OneKey Devices"
                      className="w-full h-auto max-w-2xl mx-auto drop-shadow-lg"
                    />

                    {/* 装饰性元素 */}
                    <div className="absolute top-8 right-16 w-2 h-2 bg-primary/30 rounded-full animate-pulse" />
                    <div className="absolute bottom-16 left-16 w-1.5 h-1.5 bg-primary/20 rounded-full animate-pulse delay-1000" />
                    <div className="absolute top-1/3 left-8 w-1 h-1 bg-primary/40 rounded-full animate-pulse delay-500" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
