import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CoreApi,
  DEVICE,
  DeviceStateEvent,
  Features,
  UiEvent,
  UI_REQUEST,
  UI_RESPONSE,
} from '@onekeyfe/hd-core';
import { useDeviceStore } from '../../store/deviceStore';

import { submitPin } from '../../services/hardwareService';
import { applyDeviceStateToDevice } from '../../services/deviceStateAdapter';
import { EDeviceType } from '@onekeyfe/hd-shared';
import GlobalDialogManager from '../global/GlobalDialogManager';
import WebUsbAuthorizeDialog from '../global/WebUsbAuthorizeDialog';
import { logData, logInfo, logError } from '../../utils/logger';
import { SDKUtils } from '../../utils/hardwareInstance';
import { create } from 'zustand';

// 声明全局弹窗管理器类型
declare global {
  interface Window {
    globalDialogManager?: {
      showPinDialog: () => void;
      showPassphraseDialog: () => void;
      closeAllDialogs: () => void;
    };
  }
}

interface SDKProviderProps {
  children: React.ReactNode;
}

// 固件进度状态管理
export interface FirmwareProgressData {
  progress: number;
  progressType: 'transferData' | 'installingFirmware';
}

export const useFirmwareProgressStore = create<{
  progressData: FirmwareProgressData | null;
  setProgressData: (data: FirmwareProgressData | null) => void;
  reset: () => void;
}>(set => ({
  progressData: null,
  setProgressData: data => set({ progressData: data }),
  reset: () => set({ progressData: null }),
}));

export const useFirmwareProgress = () => {
  const { progressData, setProgressData, reset } = useFirmwareProgressStore();
  return { progressData, setProgressData, reset };
};

export const SDKProvider: React.FC<SDKProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const { setDeviceAction, clearDeviceAction, updateSdkInitState } = useDeviceStore();
  const initializationRef = useRef<boolean>(false);
  const [webUsbModalOpen, setWebUsbModalOpen] = React.useState(false);
  const [webUsbResponseType, setWebUsbResponseType] = React.useState<
    | typeof UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE
    | typeof UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE
  >(UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE);
  const lastSdkRef = useRef<CoreApi | null>(null);
  const cleanupSdkListenersRef = useRef<(() => void) | null>(null);

  const setupSDKEventListeners = useCallback(
    (sdkInstance: CoreApi) => {
      cleanupSdkListenersRef.current?.();

      // 监听SDK UI事件
      const handleUiEvent = (message: UiEvent) => {
        const latestCurrentDevice = useDeviceStore.getState().currentDevice;
        logInfo(`收到UI事件: ${message.type}`, message.payload as logData);

        // 处理设备动作状态
        if (message.type === UI_REQUEST.CLOSE_UI_WINDOW) {
          clearDeviceAction();
          // 重置固件进度状态
          useFirmwareProgressStore.getState().reset();
        } else if (message.type) {
          setDeviceAction({
            isActive: true,
            actionType: message.type,
            deviceInfo: message.payload as Record<string, unknown>,
            startTime: Date.now(),
          });
        }

        // 处理UI事件
        switch (message.type) {
          case 'ui-request_pin':
            if (
              latestCurrentDevice &&
              (latestCurrentDevice.deviceType === EDeviceType.Pro ||
                latestCurrentDevice.deviceType === EDeviceType.Pro2 ||
                latestCurrentDevice.deviceType === EDeviceType.Touch)
            ) {
              submitPin('@@ONEKEY_INPUT_PIN_IN_DEVICE').catch(console.error);
            } else {
              window.globalDialogManager?.showPinDialog();
            }
            break;

          case 'ui-request_passphrase': {
            window.globalDialogManager?.showPassphraseDialog();
            break;
          }

          case 'ui-close_window':
            window.globalDialogManager?.closeAllDialogs();
            break;

          case UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE: {
            // Open modal; actual requestDevice() will be called in button onClick handler to satisfy user gesture
            setWebUsbResponseType(UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE);
            setWebUsbModalOpen(true);
            break;
          }
          case UI_REQUEST.REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE: {
            setWebUsbResponseType(UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE);
            setWebUsbModalOpen(true);
            break;
          }

          case 'ui-firmware-progress':
            if (message.payload && typeof message.payload === 'object') {
              const payload = message.payload as {
                progress?: number;
                progressType?: string;
                [key: string]: unknown;
              };
              if (typeof payload.progress === 'number' && payload.progressType) {
                useFirmwareProgressStore.getState().setProgressData({
                  progress: payload.progress,
                  progressType: payload.progressType as 'transferData' | 'installingFirmware',
                });
              }
            }
            break;

          default:
            break;
        }
      };

      // 监听设备连接/断开事件
      const handleDeviceConnect = () => {
        logInfo('device-connect');
      };

      const handleDeviceDisconnect = () => {
        logInfo('device-disconnect');
      };

      const handleDeviceFeatures = (features: Features) => {
        const store = useDeviceStore.getState();
        store.setDeviceFeatures(features);
        if (store.currentDevice) {
          store.setCurrentDevice({
            ...store.currentDevice,
            features,
          });
        }
      };

      const handleDeviceState = (stateEvent: DeviceStateEvent) => {
        const store = useDeviceStore.getState();
        const currentDevice = store.currentDevice;
        if (!currentDevice) return;
        const matchesDevice =
          currentDevice.connectId === stateEvent.connectId ||
          Boolean(
            stateEvent.state.identity.serialNo &&
              currentDevice.uuid === stateEvent.state.identity.serialNo
          ) ||
          Boolean(
            stateEvent.state.identity.deviceId &&
              currentDevice.deviceId === stateEvent.state.identity.deviceId
          );
        if (matchesDevice) {
          store.setCurrentDevice(applyDeviceStateToDevice(currentDevice, stateEvent.state));
        }
      };

      sdkInstance.on('UI_EVENT', handleUiEvent);
      sdkInstance.on('device-connect', handleDeviceConnect);
      sdkInstance.on('device-disconnect', handleDeviceDisconnect);
      sdkInstance.on(DEVICE.FEATURES, handleDeviceFeatures);
      sdkInstance.on(DEVICE.STATE, handleDeviceState);

      const cleanup = () => {
        sdkInstance.off('UI_EVENT', handleUiEvent);
        sdkInstance.off('device-connect', handleDeviceConnect);
        sdkInstance.off('device-disconnect', handleDeviceDisconnect);
        sdkInstance.off(DEVICE.FEATURES, handleDeviceFeatures);
        sdkInstance.off(DEVICE.STATE, handleDeviceState);
      };
      cleanupSdkListenersRef.current = cleanup;
      return cleanup;
    },
    [setDeviceAction, clearDeviceAction]
  );

  // 初始化SDK
  const initializeSDK = useCallback(async () => {
    if (typeof window === 'undefined') {
      throw new Error(t('sdk.browserRequired'));
    }

    try {
      updateSdkInitState({
        isInitialized: false,
        isInitializing: true,
        error: null,
        lastInitTime: Date.now(),
      });

      // 使用统一的TransportManager初始化transport状态
      SDKUtils.transport.initializeTransport();

      // 获取当前的transport类型
      const currentTransport = SDKUtils.transport.getCurrentTransport();

      // 使用统一的SDK工具初始化，会根据当前transport类型自动选择合适的SDK
      const sdkInstance = await SDKUtils.getInstance();
      lastSdkRef.current = sdkInstance;
      setupSDKEventListeners(sdkInstance);

      updateSdkInitState({
        isInitialized: true,
        isInitializing: false,
        error: null,
        lastInitTime: Date.now(),
      });

      logInfo(`SDK initialized successfully with transport: ${currentTransport}`);
    } catch (error) {
      updateSdkInitState({
        isInitialized: false,
        isInitializing: false,
        error: t('sdk.initFailed', { error: String(error) }),
        lastInitTime: Date.now(),
      });
      logError('SDK initialization failed:', { error });
      throw error;
    }
  }, [updateSdkInitState, setupSDKEventListeners, t]);

  // 自动初始化
  const handleInitializeSDK = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      await initializeSDK();
    } catch (error) {
      initializationRef.current = false;
    }
  }, [initializeSDK]);

  useEffect(() => {
    handleInitializeSDK();
    return () => {
      cleanupSdkListenersRef.current?.();
      cleanupSdkListenersRef.current = null;
    };
  }, [handleInitializeSDK]);

  return (
    <>
      {children}
      <GlobalDialogManager />
      <WebUsbAuthorizeDialog
        open={webUsbModalOpen}
        onOpenChange={setWebUsbModalOpen}
        onSuccess={device => {
          logInfo('WebUSB device selected (modal)', {
            serialNumber: device?.serialNumber ?? '',
            vendorId: device?.vendorId,
            productId: device?.productId,
          });
          lastSdkRef.current?.uiResponse({
            type: webUsbResponseType,
            payload: { deviceId: device?.serialNumber ?? '' },
          });
        }}
        onCancel={() => {
          logError('WebUSB bootloader authorization cancelled by user');
          lastSdkRef.current?.cancel();
        }}
      />
    </>
  );
};
