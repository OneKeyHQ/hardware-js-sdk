import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CoreApi, UiEvent, UI_REQUEST } from '@onekeyfe/hd-core';
import { useDeviceStore } from '../../store/deviceStore';
import { useHardwareStore } from '../../store/hardwareStore';

import { submitPin, submitPassphrase } from '../../services/hardwareService';
import { EDeviceType } from '@onekeyfe/hd-shared';
import GlobalDialogManager from '../global/GlobalDialogManager';
import { logData, logInfo } from '../../utils/logger';
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

  const setupSDKEventListeners = useCallback(
    (sdkInstance: CoreApi) => {
      // 监听SDK UI事件
      sdkInstance.on('UI_EVENT', (message: UiEvent) => {
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
                latestCurrentDevice.deviceType === EDeviceType.Touch)
            ) {
              submitPin('@@ONEKEY_INPUT_PIN_IN_DEVICE').catch(console.error);
            } else {
              window.globalDialogManager?.showPinDialog();
            }
            break;

          case 'ui-request_passphrase': {
            const hardwareState = useHardwareStore.getState();
            const shouldAutoSubmit = hardwareState.commonParameters.useEmptyPassphrase;

            if (shouldAutoSubmit) {
              submitPassphrase('', false, false).catch(console.error);
            } else {
              window.globalDialogManager?.showPassphraseDialog();
            }
            break;
          }

          case 'ui-close_window':
            window.globalDialogManager?.closeAllDialogs();
            break;

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
      });

      // 监听设备连接/断开事件
      sdkInstance.on('device-connect', device => {
        logInfo('device-connect', device);
      });

      sdkInstance.on('device-disconnect', device => {
        logInfo('device-disconnect', device);
      });
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

      // 使用统一的SDK工具初始化
      const sdkInstance = await SDKUtils.getInstance();
      setupSDKEventListeners(sdkInstance);

      updateSdkInitState({
        isInitialized: true,
        isInitializing: false,
        error: null,
        lastInitTime: Date.now(),
      });
    } catch (error) {
      updateSdkInitState({
        isInitialized: false,
        isInitializing: false,
        error: t('sdk.initFailed', { error: String(error) }),
        lastInitTime: Date.now(),
      });
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
  }, [handleInitializeSDK]);

  return (
    <>
      {children}
      <GlobalDialogManager />
    </>
  );
};
