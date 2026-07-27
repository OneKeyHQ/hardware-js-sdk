import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDeviceStore } from '../../store/deviceStore';
import { SDKUtils } from '../../utils/hardwareInstance';
import { useToast } from '../../hooks/use-toast';
import { useTransportPersistence } from '../../store/persistenceStore';
import {
  hydrateConnectedDeviceInfo,
  switchTransport,
  searchDevices,
} from '../../services/hardwareService';
import type { TransportType } from '../../utils/hardwareInstance';
import { DeviceInfo } from '../../types/hardware';
import { Button } from '../ui/Button';
import { Signal, ExternalLink, Info, Usb, Server } from 'lucide-react';
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';
import { UI_RESPONSE } from '@onekeyfe/hd-core';

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

    // Connect the first device automatically; the outer flow converts errors to UI messages.
    const targetDevice = devices[0];
    const hydratedDevice = await hydrateConnectedDeviceInfo(targetDevice);
    setCurrentDevice(hydratedDevice);
    if (hydratedDevice.features) {
      setDeviceFeatures(hydratedDevice.features);
    }
  };

  // Simple WebUSB error handling
  const showWebUsbError = (error: unknown) => {
    let message = t('transport.connectionFailed');

    if (error instanceof Error) {
      if (error.message.includes('not supported')) {
        message = t('transport.webusb.notSupported');
      } else if (error.name === 'NotFoundError' || error.message.includes('No device selected')) {
        message = t('transport.webusb.noDeviceSelected');
      }
    }

    toast({
      title: t('transport.connectionFailed'),
      description: message,
      variant: 'destructive',
    });
    setConnectedDevices([]);
  };

  // WebUSB-specific handler that must be called directly in user gesture
  const handleWebUsbConnect = async () => {
    try {
      // Check WebUSB support and request device
      if (!navigator.usb) throw new Error(t('transport.webusb.notSupported'));

      const device = await navigator.usb.requestDevice({ filters: ONEKEY_WEBUSB_FILTER });
      if (!device) throw new Error(t('transport.webusb.noDeviceSelected'));

      // Switch transport
      setTransportPreference('webusb');
      const result = await switchTransport('webusb');
      if (!result.success) {
        return toast({
          title: t('transport.connectionFailed'),
          description: t('transport.switchFailed'),
          variant: 'warning',
        });
      }

      // Notify SDK and search devices
      const sdkInstance = await SDKUtils.getInstance();
      const response = {
        type: UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE,
        payload: { deviceId: device.serialNumber ?? '' },
      };
      sdkInstance.uiResponse(response);

      const searchResult = await searchDevices();
      if (searchResult.success && searchResult.payload) {
        const devices = searchResult.payload as DeviceInfo[];
        setConnectedDevices(devices);

        if (devices.length === 0) {
          toast({
            title: t('transport.connectionFailed'),
            description: t('transport.webusb.deviceUnavailable'),
            variant: 'warning',
          });
          return;
        }

        await handleDeviceConnection(devices);
        toast({
          title: t('transport.connectionSuccessful'),
          description: t('transport.webusb.deviceConnected'),
          variant: 'default',
        });
      } else {
        toast({
          title: t('transport.searchFailed'),
          description: t('transport.webusb.deviceUnavailable'),
          variant: 'warning',
        });
        setConnectedDevices([]);
      }
    } catch (error) {
      showWebUsbError(error);
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
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
      // Special handling for WebUSB - must call requestDevice directly in user gesture
      if (newTransport === 'webusb') {
        await handleWebUsbConnect();
        return;
      }

      // For other transport types, use the standard flow
      setTransportPreference(newTransport);

      // 切换传输方式
      const result = await switchTransport(newTransport);

      if (!result.success) {
        toast({
          title: t('transport.connectionFailed'),
          description: t('transport.switchFailed'),
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
        toast({
          title: t('transport.searchFailed'),
          description: t('transport.searchDeviceFailed'),
          variant: 'warning',
        });
        setConnectedDevices([]);
      }
    } catch {
      toast({
        title: t('transport.connectionTip'),
        description: t('transport.unknownConnectionError'),
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
        description: t('transport.sdkInitDescription'),
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
