import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDeviceStore } from '../../store/deviceStore';
import { useSDK } from '../../hooks/useSDK';
import { useToast } from '../../hooks/use-toast';
import { switchTransport, TransportType, searchDevices } from '../../services/hardwareService';
import { DeviceInfo } from '../../types/hardware';
import { Button } from '../ui/Button';
import { Monitor, Signal, ExternalLink, Info, Usb, Server } from 'lucide-react';

interface TransportSwitcherProps {
  className?: string;
}

const TransportSwitcher: React.FC<TransportSwitcherProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const {
    transportType,
    setTransportType,
    setIsConnecting,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    sdkInitState,
  } = useDeviceStore();

  // 从localStorage恢复transport选择
  React.useEffect(() => {
    const savedTransport = localStorage.getItem('preferred-transport') as TransportType;
    if (savedTransport && savedTransport !== transportType) {
      setTransportType(savedTransport);
    }
  });

  // 保存transport选择到localStorage
  const saveTransportPreference = (transport: TransportType) => {
    localStorage.setItem('preferred-transport', transport);
  };
  const { getSDKInstance } = useSDK();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
    {
      type: 'jsbridge',
      label: 'JSBridge',
      icon: <Monitor className="h-4 w-4" />,
      description: t('transport.jsbridge.description'),
      needsBridge: true,
    },
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
      // 先更新UI状态
      setTransportType(newTransport);

      // 保存用户选择
      saveTransportPreference(newTransport);

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
              className={`w-full h-14 flex items-center justify-between px-5 py-4 transition-all duration-200 ${
                transportType === option.type
                  ? 'bg-gray-900 hover:bg-gray-800 text-white border-gray-700 shadow-md ring-1 ring-gray-600'
                  : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200 hover:border-gray-300'
              } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`${transportType === option.type ? 'text-white' : 'text-gray-600'}`}
                >
                  {option.icon}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{option.label}</div>
                  {option.description && (
                    <div
                      className={`text-xs ${
                        transportType === option.type ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
              {option.disabled && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {t('transport.comingSoon')}
                </span>
              )}
            </Button>

            {/* JSBridge 下载提示 */}
            {option.type === 'jsbridge' && option.needsBridge && (
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
