import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDeviceStore } from '../../store/deviceStore';
import { SDKUtils } from '../../utils/hardwareInstance';
import { useToast } from '../../hooks/use-toast';
import { useTransportPersistence } from '../../store/persistenceStore';
import { switchTransport, searchDevices } from '../../services/hardwareService';
import type { TransportType } from '../../utils/hardwareInstance';
import { DeviceInfo } from '../../types/hardware';
import { Button } from '../ui/Button';
import { Monitor, Signal, ExternalLink, Info, Usb, Server } from 'lucide-react';

interface TransportSwitcherProps {
  className?: string;
}

const TransportSwitcher: React.FC<TransportSwitcherProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const {
    setIsConnecting,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    sdkInitState,
  } = useDeviceStore();

  const { preferredType: transportType, setTransportPreference } = useTransportPersistence();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [bridgeUnavailable, setBridgeUnavailable] = useState(false);

  // 检测bridge状态 - 等待SDK初始化完成后再检查
  useEffect(() => {
    const checkBridge = async () => {
      // 只有在SDK初始化完成后才检查bridge状态
      if (!sdkInitState.isInitialized) {
        return;
      }

      try {
        const sdkInstance = await SDKUtils.getInstance();
        const result = await sdkInstance.checkBridgeStatus();

        // 只有在bridge不可用时才设置状态
        setBridgeUnavailable(!result.success);
      } catch (error) {
        // 检查失败时认为bridge不可用
        setBridgeUnavailable(true);
      }
    };

    // 当SDK初始化状态改变时检查bridge
    void checkBridge();
  }, [sdkInitState.isInitialized]);

  const transportOptions: Array<{
    type: TransportType | 'webble';
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    description?: string;
    needsBridge?: boolean;
    isEmulator?: boolean;
  }> = [
    {
      type: 'webusb',
      label: 'WebUSB',
      icon: <Usb className="h-4 w-4" />,
      description: t('transport.webusb.description'),
    },
    // {
    //   type: 'jsbridge',
    //   label: 'JSBridge',
    //   icon: <Monitor className="h-4 w-4" />,
    //   description: t('transport.jsbridge.description'),
    //   needsBridge: true,
    // },
    {
      type: 'emulator',
      label: t('common.emulator'),
      icon: <Server className="h-4 w-4" />,
      description: t('transport.emulator.description'),
      isEmulator: true,
    },
    {
      type: 'webble',
      label: 'WebBLE',
      icon: <Signal className="h-4 w-4" />,
      description: t('transport.webble.description'),
      disabled: true,
    },
  ];

  // Auto-connect logic for different connection types
  const handleDeviceConnection = async (devices: DeviceInfo[]) => {
    if (!devices.length) return;

    try {
      // 自动选择第一个设备进行连接
      const targetDevice = devices[0];

      // 获取设备特征信息
      const sdk = await SDKUtils.getInstance();
      if (targetDevice.connectId && targetDevice.deviceId) {
        const featuresResult = await sdk.getFeatures(targetDevice.connectId);
        if (featuresResult.success && featuresResult.payload) {
          setDeviceFeatures(featuresResult.payload);

          // 获取OneKey特定的features
          const onekeyFeaturesResult = await sdk.getOnekeyFeatures(targetDevice.connectId);
          if (onekeyFeaturesResult.success && onekeyFeaturesResult.payload) {
            // 更新设备信息，包含onekeyFeatures
            const updatedDevice = {
              ...targetDevice,
              features: featuresResult.payload,
              onekeyFeatures: onekeyFeaturesResult.payload,
            };
            setCurrentDevice(updatedDevice);
          } else {
            // 即使获取onekeyFeatures失败，也设置基本的设备信息
            const updatedDevice = {
              ...targetDevice,
              features: featuresResult.payload,
            };
            setCurrentDevice(updatedDevice);
          }
        } else {
          setCurrentDevice(targetDevice);
        }
      } else {
        setCurrentDevice(targetDevice);
      }
    } catch (error) {
      console.error('Auto connection error:', error);
    }
  };

  const handleTransportSwitch = async (newTransport: TransportType) => {
    // 检查SDK是否已初始化
    if (!sdkInitState.isInitialized) {
      toast({
        title: t('transport.sdkNotReady'),
        description: t('transport.pleaseWaitForInit'),
        variant: 'warning',
      });
      return;
    }

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setIsConnecting(true);

    try {
      // 对于WebUSB，必须在用户手势上下文中立即调用requestDevice
      if (newTransport === 'webusb') {
        // 保存用户选择到持久化存储
        setTransportPreference(newTransport);

        // 获取SDK实例（应该已经初始化，所以这个调用应该是同步的）
        const sdkInstance = await SDKUtils.getInstance();
        await sdkInstance.switchTransport('webusb');
        // 立即请求WebUSB设备权限，不要在此之前进行任何可能破坏用户手势上下文的异步操作
        const promptResponse = await sdkInstance.promptWebDeviceAccess();

        if (promptResponse.success && promptResponse.payload?.device) {
          const devices = [promptResponse.payload.device] as DeviceInfo[];
          setConnectedDevices(devices);

          // 自动连接设备
          await handleDeviceConnection(devices);

          toast({
            title: t('transport.connectionSuccessful'),
            description: t('transport.webusb.deviceConnected'),
            variant: 'default',
          });
        } else {
          const errorMessage =
            !promptResponse.success && 'error' in promptResponse.payload
              ? promptResponse.payload.error
              : t('transport.webusb.noDeviceSelected');

          toast({
            title: t('transport.webusb.permissionFailed'),
            description: errorMessage,
            variant: 'warning',
          });
          setConnectedDevices([]);
        }
        return;
      }

      // 对于其他transport类型，使用原有逻辑
      // 保存用户选择到持久化存储（这会自动更新UI状态）
      setTransportPreference(newTransport);

      // 切换传输方式
      const result = await switchTransport(newTransport);

      if (!result.success) {
        const errorMessage = result.payload?.error || t('transport.switchFailed');
        toast({
          title: t('transport.connectionFailed'),
          description: errorMessage,
          variant: 'warning',
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
            title: t('transport.noDevicesFound'),
            description: t('transport.ensureDeviceConnected'),
            variant: 'warning',
          });
        }
      } else {
        const errorMessage = searchResult.payload?.error || t('transport.searchDeviceFailed');
        toast({
          title: t('transport.searchFailed'),
          description: errorMessage,
          variant: 'warning',
        });
        setConnectedDevices([]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('transport.unknownConnectionError');
      toast({
        title: t('transport.connectionTip'),
        description: errorMessage,
        variant: 'warning',
      });
      setConnectedDevices([]);
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
    }
  };

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
    <div className={`w-full space-y-6 ${className}`}>
      {/* 连接方式选择 */}
      <div className="space-y-3">
        {transportOptions.map(option => (
          <div key={option.type} className="space-y-2">
            <Button
              onClick={() =>
                !option.disabled && handleTransportSwitch(option.type as TransportType)
              }
              disabled={option.disabled || isLoading || !sdkInitState.isInitialized}
              variant="outline"
              size="sm"
              className={`w-full min-h-12 sm:min-h-14 flex items-center justify-between px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 transition-all duration-200 ${
                transportType === option.type
                  ? 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-md ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-1 min-w-0 overflow-hidden">
                <div
                  className={`flex-shrink-0 ${
                    transportType === option.type
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {option.icon}
                </div>
                <div className="text-left flex-1 min-w-0 overflow-hidden">
                  <div
                    className="text-xs sm:text-sm font-medium"
                    title={option.label}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {option.label}
                  </div>
                  {option.description && (
                    <div
                      className={`text-xs leading-tight mt-0.5 ${
                        transportType === option.type
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <div
                        title={option.description}
                        className="description-text"
                        style={{
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {option.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {option.disabled && (
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0 ml-1 sm:ml-2">
                  {t('transport.comingSoon')}
                </span>
              )}
            </Button>

            {/* JSBridge 下载提示 - 只有在bridge不可用时才显示 */}
            {option.type === 'jsbridge' && option.needsBridge && bridgeUnavailable && (
              <div className="ml-8 flex items-center space-x-1.5 text-xs text-gray-500">
                <Info className="h-3 w-3" />
                <span>{t('transport.needsBridge')}</span>
                <a
                  href="https://help.onekey.so/hc/zh-cn/articles/9740566472335-%E4%B8%8B%E8%BD%BD%E5%B9%B6%E6%9B%B4%E6%96%B0-OneKey-Bridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline decoration-1 underline-offset-2 inline-flex items-center space-x-1 transition-colors"
                >
                  <span>{t('transport.downloadBridge')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* 模拟器教程提示 */}
            {option.type === 'emulator' && option.isEmulator && (
              <div className="ml-8 flex items-center space-x-1.5 text-xs text-gray-500">
                <Info className="h-3 w-3" />
                <span>{t('transport.needsEmulator')}</span>
                <Link
                  to="/emulator"
                  className="text-green-600 hover:text-green-700 underline decoration-1 underline-offset-2 inline-flex items-center space-x-1 transition-colors"
                >
                  <span>{t('transport.startEmulator')}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransportSwitcher;
