import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CoreApi, UiEvent, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { useDeviceStore } from '../../store/deviceStore';
import { useHardwareStore } from '../../store/hardwareStore';

import { submitPin, submitPassphrase } from '../../services/hardwareService';
import { EDeviceType } from '@onekeyfe/hd-shared';
import GlobalDialogManager from '../global/GlobalDialogManager';
import WebUsbAuthorizeDialog from '../global/WebUsbAuthorizeDialog';
import { logData, logInfo, logError } from '../../utils/logger';
import { SDKUtils } from '../../utils/hardwareInstance';
import { create } from 'zustand';
import {
  createHardwareUiState,
  HardwareUiEventQueue,
  reduceHardwareUiEvent,
} from '../../utils/hardwareUiStateMachine';

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
  const hardwareUiQueueRef = useRef(new HardwareUiEventQueue());
  const hardwareUiStateRef = useRef(createHardwareUiState());

  const setupSDKEventListeners = useCallback(
    (sdkInstance: CoreApi) => {
      hardwareUiQueueRef.current.reset();
      hardwareUiStateRef.current = createHardwareUiState();

      // 监听SDK UI事件
      sdkInstance.on('UI_EVENT', (message: UiEvent) => {
        void hardwareUiQueueRef.current
          .enqueue(message, async queuedMessage => {
            const latestCurrentDevice = useDeviceStore.getState().currentDevice;
            logInfo(`收到UI事件: ${queuedMessage.type}`, queuedMessage.payload as logData);

            const previousState = hardwareUiStateRef.current;
            const nextState = reduceHardwareUiEvent(previousState, queuedMessage);
            hardwareUiStateRef.current = nextState;

            if (nextState.isOpen && nextState.actionType) {
              setDeviceAction({
                isActive: true,
                actionType: nextState.actionType,
                deviceInfo: queuedMessage.payload as Record<string, unknown>,
                startTime: Date.now(),
              });
            } else if (queuedMessage.type === UI_REQUEST.CLOSE_UI_WINDOW) {
              clearDeviceAction();
            } else if (nextState === previousState && queuedMessage.type) {
              setDeviceAction({
                isActive: true,
                actionType: queuedMessage.type,
                deviceInfo: queuedMessage.payload as Record<string, unknown>,
                startTime: Date.now(),
              });
            }

            if (queuedMessage.type === UI_REQUEST.CLOSE_UI_WINDOW) {
              useFirmwareProgressStore.getState().reset();
              window.globalDialogManager?.closeAllDialogs();
              hardwareUiQueueRef.current.reset();
              return;
            }

            switch (queuedMessage.type) {
              case UI_REQUEST.REQUEST_PIN:
                if (
                  latestCurrentDevice &&
                  (latestCurrentDevice.deviceType === EDeviceType.Pro ||
                    latestCurrentDevice.deviceType === EDeviceType.Touch)
                ) {
                  await submitPin('@@ONEKEY_INPUT_PIN_IN_DEVICE').catch(console.error);
                } else {
                  window.globalDialogManager?.showPinDialog();
                }
                break;

              case UI_REQUEST.REQUEST_PASSPHRASE: {
                const hardwareState = useHardwareStore.getState();
                const shouldAutoSubmit = hardwareState.commonParameters.useEmptyPassphrase;

                if (shouldAutoSubmit) {
                  await submitPassphrase('', false, false).catch(console.error);
                } else {
                  window.globalDialogManager?.showPassphraseDialog();
                }
                break;
              }

              case UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE:
                setWebUsbResponseType(UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE);
                setWebUsbModalOpen(true);
                break;

              case UI_REQUEST.REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE:
                setWebUsbResponseType(UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE);
                setWebUsbModalOpen(true);
                break;

              case UI_REQUEST.FIRMWARE_PROGRESS:
                if (queuedMessage.payload && typeof queuedMessage.payload === 'object') {
                  const payload = queuedMessage.payload as {
                    progress?: number;
                    progressType?: string;
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
          })
          .catch(error => {
            logError('硬件 UI 事件处理失败', { error });
          });
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
