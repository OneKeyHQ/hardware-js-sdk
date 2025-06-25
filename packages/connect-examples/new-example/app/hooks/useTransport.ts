import { useCallback } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { switchTransport, searchDevices, TransportType } from '../services/hardwareService';
import { useToast } from './use-toast';
import { useTranslation } from 'react-i18next';
import { useSDK } from './useSDK';

interface UseTransportReturn {
  transportType: TransportType;
  isConnecting: boolean;
  setTransportType: (type: TransportType) => void;
  switchAndConnect: (type: TransportType) => Promise<void>;
  quickConnect: () => Promise<void>;
}

export function useTransport(): UseTransportReturn {
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    transportType,
    isConnecting,
    sdkInitState,
    setTransportType,
    setIsConnecting,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
  } = useDeviceStore();

  const { getSDKInstance } = useSDK();

  // 切换 transport 并尝试连接设备
  const switchAndConnect = useCallback(
    async (newTransport: TransportType) => {
      if (!sdkInitState.isInitialized) {
        toast({
          title: t('transport.sdkNotReady'),
          description: t('transport.pleaseWaitForInit'),
          variant: 'warning',
        });
        return;
      }

      if (isConnecting) {
        return;
      }

      setIsConnecting(true);

      try {
        // 更新 store 中的 transport 类型（这会自动持久化）
        setTransportType(newTransport);

        // 切换传输方式
        const switchResult = await switchTransport(newTransport);

        if (!switchResult.success) {
          const errorMessage = switchResult.payload?.error || t('transport.switchFailed');
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
          const devices = searchResult.payload;
          setConnectedDevices(devices);

          if (devices.length === 0) {
            toast({
              title: t('transport.noDevicesFound'),
              description: t('transport.ensureDeviceConnected'),
              variant: 'warning',
            });
          } else {
            // 自动连接第一个设备
            const targetDevice = devices[0];
            setCurrentDevice(targetDevice);

            // 获取设备特征信息
            try {
              const sdk = await getSDKInstance();
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
            } catch (error) {
              console.error('Failed to get device features:', error);
              toast({
                title: t('transport.switchSuccess'),
                description: `${t('transport.switchedTo')} ${newTransport}`,
              });
            }
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
        setIsConnecting(false);
      }
    },
    [
      sdkInitState.isInitialized,
      isConnecting,
      setTransportType,
      setIsConnecting,
      setConnectedDevices,
      toast,
      t,
    ]
  );

  // 使用当前 transport 快速连接
  const quickConnect = useCallback(async () => {
    await switchAndConnect(transportType);
  }, [switchAndConnect, transportType]);

  return {
    transportType,
    isConnecting,
    setTransportType,
    switchAndConnect,
    quickConnect,
  };
}
