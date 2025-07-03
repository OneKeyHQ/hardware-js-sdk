import { useMemo } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import type { DeviceInfo } from '../types/hardware';
import type { DeviceModel, ThemeType } from '../components/ui/DeviceActionAnimation';

interface UseDeviceInfoReturn {
  currentDevice: DeviceInfo | null;
  deviceModel: DeviceModel;
  deviceTheme: ThemeType;
  isConnected: boolean;
}

export function useDeviceInfo(): UseDeviceInfoReturn {
  const { currentDevice } = useDeviceStore();

  // 获取设备模型
  const deviceModel = useMemo((): DeviceModel => {
    if (!currentDevice?.deviceType) {
      return 'classic';
    }

    const deviceType = currentDevice.deviceType.toString().toLowerCase();
    if (deviceType.includes('classic')) return 'classic';
    if (deviceType.includes('mini')) return 'mini';
    if (deviceType.includes('pro')) return 'pro';
    if (deviceType.includes('touch')) return 'touch';
    return 'classic';
  }, [currentDevice?.deviceType]);

  // 获取设备主题
  const deviceTheme = useMemo((): ThemeType => {
    // 目前固定返回 light，未来可以根据设备状态动态调整
    return 'light';
  }, []);

  const isConnected = !!currentDevice;

  return {
    currentDevice,
    deviceModel,
    deviceTheme,
    isConnected,
  };
}
