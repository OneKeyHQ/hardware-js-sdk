import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { Search, AlertTriangle, ArrowRight } from 'lucide-react';
import { useDeviceStore } from '../../store/deviceStore';
import { searchDevices } from '../../services/hardwareService';
import { useToast } from '../../hooks/use-toast';
import { SDKUtils } from '../../utils/hardwareInstance';

interface DeviceNotConnectedStateProps {
  className?: string;
  showFullPage?: boolean;
  title?: string;
  description?: string;
}

export function DeviceNotConnectedState({
  className = '',
  showFullPage = false,
}: DeviceNotConnectedStateProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    currentDevice,
    setIsConnecting,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    sdkInitState,
  } = useDeviceStore();

  // 如果设备已连接，不显示此组件
  if (currentDevice) {
    return null;
  }

  // 搜索设备功能
  const handleSearchDevice = async () => {
    if (!sdkInitState.isInitialized) {
      toast({
        title: t('transport.sdkNotReady'),
        description: t('transport.pleaseWaitForInit'),
        variant: 'warning',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // 搜索设备
      const searchResult = await searchDevices();

      if (searchResult.success && searchResult.payload) {
        const devices = searchResult.payload;
        setConnectedDevices(devices);

        // 自动连接第一个设备
        if (devices.length > 0) {
          const targetDevice = devices[0];
          setCurrentDevice(targetDevice);

          // 获取设备特征信息
          const sdk = await SDKUtils.getInstance();
          if (targetDevice.connectId && targetDevice.deviceId) {
            const featuresResult = await sdk.getFeatures(targetDevice.connectId);
            if (featuresResult.success && featuresResult.payload) {
              setDeviceFeatures(featuresResult.payload);
            }
          }

          toast({
            title: t('device.connected'),
            description: `${t('device.connectedTo')} ${
              targetDevice.label || targetDevice.deviceType
            }`,
            variant: 'default',
          });
        } else {
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
      setIsConnecting(false);
    }
  };

  if (showFullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* 优化的图标区域 */}
          <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center border-2 border-orange-200/50 dark:border-orange-800/50">
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>

          {/* 标题和描述 */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-orange-900 dark:text-orange-100">
              {t('device.connectionRequired')}
            </h2>
            <p className="text-orange-700 dark:text-orange-300 text-sm max-w-sm mx-auto">
              {t('device.pleaseConnectFirst')}
            </p>
          </div>

          {/* 优化的操作按钮  */}
          <div className="space-y-2">
            <Button
              onClick={handleSearchDevice}
              variant="default"
              size="lg"
              disabled={!sdkInitState.isInitialized}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4" />
              {t('device.searchDevices')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={`border-orange-200/50 bg-orange-50/30 dark:border-orange-800/50 dark:bg-orange-950/20 ${className}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center border border-orange-200/50 dark:border-orange-800/50">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-orange-900 dark:text-orange-100">
                {t('device.connectionRequired')}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {t('device.pleaseConnectFirst')}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSearchDevice}
            variant="default"
            size="sm"
            disabled={!sdkInitState.isInitialized}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shrink-0 h-7 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="h-3 w-3" />
            {t('device.searchDevices')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
