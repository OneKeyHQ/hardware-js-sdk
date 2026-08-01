import { Card, CardContent } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useDeviceStore } from '../store/deviceStore';
import { useTransportPersistence } from '../store/persistenceStore';
import {
  CheckCircle,
  XCircle,
  Usb,
  Wifi,
  Server,
  AlertCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import TransportSwitcher from '../components/common/TransportSwitcher';
import DeviceIcon from '../components/device/DeviceIcon';
import deviceList from '../assets/device_list.png';
import { useToast } from '../hooks/use-toast';
import { PageLayout } from '../components/common/PageLayout';
import { useNavigate } from 'react-router-dom';
import React from 'react';
export default function IndexPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    currentDevice,
    getCurrentDeviceLabel,
    isCurrentDeviceClassicModel,
    isConnecting,
    sdkInitState,
  } = useDeviceStore();

  const { preferredType: transportType } = useTransportPersistence();

  const getTransportIcon = () => {
    switch (transportType) {
      case 'webusb':
        return <Usb className="h-4 w-4 text-primary" />;
      case 'jsbridge':
        return <Wifi className="h-4 w-4 text-primary" />;
      case 'emulator':
        return <Server className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const deviceDisplayName = currentDevice ? getCurrentDeviceLabel() : 'Unknown';

  // 处理 SDK 初始化错误 - 使用 toast 通知
  React.useEffect(() => {
    if (sdkInitState.error) {
      toast({
        title: t('transport.sdkInitError'),
        description: sdkInitState.error,
        variant: 'destructive',
      });
    }
  }, [sdkInitState.error, toast, t]);

  return (
    <PageLayout fixedHeight>
      <div className="flex justify-center items-center min-h-full p-6">
        <div className="container max-w-7xl mx-auto">
          {/* 主标题区域 - 紧凑设计 */}
          <div className="text-center space-y-3 mb-5">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{t('home.title')}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('home.subtitle')}</p>
          </div>

          {/* 主要内容区域 - 响应式布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-stretch mb-12">
            {/* 左侧：设备连接控制 */}
            <div className="lg:col-span-1 w-full">
              <Card className="bg-card border border-border/50 shadow-sm h-full relative">
                {/* 卡片右上角状态指示器 */}
                {sdkInitState.isInitializing && (
                  <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-600">
                        {t('transport.sdkInitializing')}
                      </span>
                    </div>
                  </div>
                )}

                {isConnecting && !sdkInitState.isInitializing && (
                  <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-600">{t('common.connecting')}</span>
                    </div>
                  </div>
                )}

                {sdkInitState.error && (
                  <div className="absolute top-4 right-4 z-10 bg-red-50 border border-red-200 rounded-lg shadow-sm px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">{t('transport.sdkInitError')}</span>
                    </div>
                  </div>
                )}

                <CardContent className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
                  <div className="space-y-4 sm:space-y-6 lg:space-y-8 flex-1">
                    {/* 连接状态 */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start justify-start">
                        <div className="flex items-start gap-2 sm:gap-3 w-full min-w-0">
                          <div className="flex-shrink-0 mt-0.5">
                            {currentDevice ? (
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            ) : (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3
                              className="font-semibold text-sm sm:text-base text-foreground leading-tight"
                              title={
                                currentDevice ? t('device.connected') : t('device.disconnected')
                              }
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {currentDevice ? t('device.connected') : t('device.disconnected')}
                            </h3>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 min-w-0">
                              <div className="flex-shrink-0">{getTransportIcon()}</div>
                              <p
                                className="text-xs sm:text-sm text-muted-foreground flex-1 min-w-0"
                                title={transportType || t('device.notSelected')}
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {transportType || t('device.notSelected')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 连接方式选择 */}
                    <div className="space-y-3 sm:space-y-4">
                      <h4
                        className="font-medium text-sm sm:text-base text-foreground"
                        title={t('device.selectConnection')}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('device.selectConnection')}
                      </h4>
                      <div className="w-full overflow-hidden">
                        <TransportSwitcher />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：设备详细信息展示 */}
            <div className="lg:col-span-2 w-full min-w-0">
              {currentDevice ? (
                /* 已连接设备的详细信息 */
                <Card className="bg-card border border-border/50 shadow-sm h-full">
                  <CardContent className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
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
                              {t('home.connectedVia', { transport: transportType })}
                            </span>
                          </div>
                        </div>

                        {/* 关键信息网格 */}
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">
                              {t('common.deviceType')}
                            </div>
                            <div className="text-sm font-medium">
                              {currentDevice.deviceType.toUpperCase()}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">
                              {t('common.connectId')}
                            </div>
                            <div className="text-sm font-mono">{currentDevice.connectId}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 分隔线 */}
                    <div className="border-t border-border/50 mb-6"></div>

                    {/* 设备信息 - 剩余空间填充 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-foreground">
                          {t('common.deviceInfo')}
                        </h3>
                        {/* 优化的设备详情按钮 */}
                        <button
                          onClick={() => navigate('/device-info')}
                          className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 border border-blue-200/50 hover:border-blue-300/70 dark:border-blue-800/50 dark:hover:border-blue-700/70 shadow-sm hover:shadow-lg backdrop-blur-sm"
                          title="View Complete Device Information"
                        >
                          <Info className="w-4 h-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                          <span className="text-sm font-medium">View Details</span>
                          <ChevronRight className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('common.uuid')}</span>
                          <span className="text-xs font-mono">{currentDevice.uuid || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">deviceId</span>
                          <span className="text-sm font-mono">{currentDevice.deviceId}</span>
                        </div>
                        {currentDevice.features && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('common.firmwareVersion')}
                              </span>
                              <span className="text-sm">
                                {currentDevice.features.onekey_firmware_version}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('common.bluetoothVersion')}
                              </span>
                              <span className="text-sm">
                                {currentDevice.features.onekey_ble_version ||
                                  currentDevice.features.ble_ver ||
                                  'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('common.bootVersion')}
                              </span>
                              <span className="text-sm">
                                {currentDevice.features.onekey_boot_version || 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t('common.pinInputSupport')}
                          </span>
                          {isCurrentDeviceClassicModel()
                            ? t('common.supported')
                            : t('common.notSupported')}
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
    </PageLayout>
  );
}
