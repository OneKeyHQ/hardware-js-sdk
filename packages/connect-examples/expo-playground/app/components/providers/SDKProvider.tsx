import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CoreApi, LOG_EVENT, UiEvent, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { useDeviceStore } from '../../store/deviceStore';
import { useHardwareStore } from '../../store/hardwareStore';

import { submitPin, submitPassphrase } from '../../services/hardwareService';
import { EDeviceType } from '@onekeyfe/hd-shared';
import GlobalDialogManager from '../global/GlobalDialogManager';
import WebUsbAuthorizeDialog from '../global/WebUsbAuthorizeDialog';
import { logData, logInfo, logError, logHardware } from '../../utils/logger';
import { SDKUtils, isSdkDebugEnabled } from '../../utils/hardwareInstance';
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

const SDK_DEBUG_LOG_PATTERN =
  /(ProtocolV2|WebUsbTransport|hd-transport-webusb|DeviceCommands|call-)/;
const SDK_PROTOCOL_V2_RAW_LOG_PATTERN =
  /\[ProtocolV2[^\]]*\]\s+(TX frame|RX frame|TX name=.*\|\s*RX seq=|RX payload type=|TX payload name=)/;
const SDK_DEBUG_LOG_FLUSH_INTERVAL_MS = 300;
const SDK_DEBUG_LOG_MAX_QUEUE_LENGTH = 200;
const SDK_DEBUG_LOG_MAX_BATCH_LENGTH = 60;
const SDK_DEBUG_LOG_MAX_TEXT_LENGTH = 1800;

function stringifySdkLogItem(item: unknown): string {
  if (typeof item === 'string') return item;
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

function truncateSdkDebugText(text: string): string {
  if (text.length <= SDK_DEBUG_LOG_MAX_TEXT_LENGTH) return text;
  return `${text.slice(0, SDK_DEBUG_LOG_MAX_TEXT_LENGTH)}...`;
}

function getProtocolV2RawLogLines(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => SDK_PROTOCOL_V2_RAW_LOG_PATTERN.test(line));
}

// 固件进度状态管理
export interface FirmwareProgressData {
  progress: number;
  progressType: 'transferData' | 'installingFirmware';
  transferredBytes?: number;
  totalBytes?: number;
  rateBytesPerSecond?: number;
  elapsedMs?: number;
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
  const sdkDebugLogQueueRef = useRef<string[]>([]);
  const sdkDebugLogFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressUpdateRef = useRef<{ time: number; progress: number }>({
    time: 0,
    progress: -1,
  });
  const progressLogRef = useRef<{ time: number; progress: number }>({
    time: 0,
    progress: -1,
  });

  const flushSdkDebugLogs = useCallback(() => {
    sdkDebugLogFlushTimerRef.current = null;

    const queuedLogs = sdkDebugLogQueueRef.current.splice(0);
    if (queuedLogs.length === 0) return;

    const droppedCount = Math.max(queuedLogs.length - SDK_DEBUG_LOG_MAX_BATCH_LENGTH, 0);
    const visibleLogs = queuedLogs.slice(-SDK_DEBUG_LOG_MAX_BATCH_LENGTH);

    logHardware(
      'SDK debug log',
      {
        count: queuedLogs.length,
        ...(droppedCount > 0 ? { dropped: droppedCount } : {}),
        message: visibleLogs.join('\n'),
      },
      {
        console: false,
        persist: false,
        store: false,
      }
    );
  }, []);

  const setupSDKEventListeners = useCallback(
    (sdkInstance: CoreApi) => {
      const sdkDebugEnabled = isSdkDebugEnabled();

      const updateFirmwareProgress = (
        data: FirmwareProgressData,
        options: { force?: boolean } = {}
      ) => {
        const now = Date.now();
        const previous = progressUpdateRef.current;
        const shouldUpdate =
          options.force ||
          data.progress >= 100 ||
          data.progress === 0 ||
          (data.progress !== previous.progress && now - previous.time >= 100) ||
          now - previous.time >= 100;

        if (!shouldUpdate) return;

        progressUpdateRef.current = {
          time: now,
          progress: data.progress,
        };
        useFirmwareProgressStore.getState().setProgressData(data);
      };

      const logProgressEvent = (type: UiEvent['type'], data: FirmwareProgressData) => {
        const now = Date.now();
        const previous = progressLogRef.current;
        if (data.progress < 100 && now - previous.time < 1000) {
          return;
        }
        progressLogRef.current = {
          time: now,
          progress: data.progress,
        };
        logHardware(
          'SDK progress event',
          {
            type,
            progress: data.progress,
            progressType: data.progressType,
            transferredBytes: data.transferredBytes,
            totalBytes: data.totalBytes,
            rateBytesPerSecond: data.rateBytesPerSecond,
          },
          {
            console: false,
            persist: false,
          }
        );
      };

      sdkInstance.on(LOG_EVENT, (message: { payload?: unknown }) => {
        if (!sdkDebugEnabled) {
          return;
        }

        const payload = message.payload;
        const items = Array.isArray(payload) ? payload : [payload];
        const text = items
          .filter(item => item !== undefined && item !== null)
          .map(stringifySdkLogItem)
          .join(' ');

        if (!text || !SDK_DEBUG_LOG_PATTERN.test(text)) {
          return;
        }

        getProtocolV2RawLogLines(text).forEach(line => {
          logHardware(
            'Protocol V2 raw transport',
            { line },
            {
              console: false,
              persist: false,
            }
          );
        });

        sdkDebugLogQueueRef.current.push(truncateSdkDebugText(text));
        if (sdkDebugLogQueueRef.current.length > SDK_DEBUG_LOG_MAX_QUEUE_LENGTH) {
          sdkDebugLogQueueRef.current.splice(
            0,
            sdkDebugLogQueueRef.current.length - SDK_DEBUG_LOG_MAX_QUEUE_LENGTH
          );
        }

        if (!sdkDebugLogFlushTimerRef.current) {
          sdkDebugLogFlushTimerRef.current = setTimeout(
            flushSdkDebugLogs,
            SDK_DEBUG_LOG_FLUSH_INTERVAL_MS
          );
        }
      });

      // 监听SDK UI事件
      sdkInstance.on('UI_EVENT', (message: UiEvent) => {
        const latestCurrentDevice = useDeviceStore.getState().currentDevice;
        const isProgressEvent =
          message.type === UI_REQUEST.DEVICE_PROGRESS ||
          message.type === UI_REQUEST.FIRMWARE_PROGRESS;
        if (!isProgressEvent) {
          logInfo(`收到UI事件: ${message.type}`, message.payload as logData);
        }

        // 处理设备动作状态
        if (message.type === UI_REQUEST.CLOSE_UI_WINDOW) {
          clearDeviceAction();
          // 重置固件进度状态
          useFirmwareProgressStore.getState().reset();
        } else if (message.type && !isProgressEvent) {
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

          case UI_REQUEST.FIRMWARE_PROGRESS:
            if (message.payload && typeof message.payload === 'object') {
              const payload = message.payload as {
                progress?: number;
                progressType?: string;
                transferredBytes?: number;
                totalBytes?: number;
                rateBytesPerSecond?: number;
                elapsedMs?: number;
                [key: string]: unknown;
              };
              if (typeof payload.progress === 'number' && payload.progressType) {
                const progressData = {
                  progress: payload.progress,
                  progressType: payload.progressType as 'transferData' | 'installingFirmware',
                  transferredBytes: payload.transferredBytes,
                  totalBytes: payload.totalBytes,
                  rateBytesPerSecond: payload.rateBytesPerSecond,
                  elapsedMs: payload.elapsedMs,
                };
                updateFirmwareProgress(progressData, { force: payload.progress >= 100 });
                logProgressEvent(message.type, progressData);
              }
            }
            break;

          case UI_REQUEST.DEVICE_PROGRESS:
            if (message.payload && typeof message.payload === 'object') {
              const payload = message.payload as {
                progress?: number;
                transferredBytes?: number;
                totalBytes?: number;
                rateBytesPerSecond?: number;
                elapsedMs?: number;
              };
              if (typeof payload.progress === 'number') {
                const progressData = {
                  progress: payload.progress,
                  progressType: 'transferData',
                  transferredBytes: payload.transferredBytes,
                  totalBytes: payload.totalBytes,
                  rateBytesPerSecond: payload.rateBytesPerSecond,
                  elapsedMs: payload.elapsedMs,
                } satisfies FirmwareProgressData;
                updateFirmwareProgress(progressData, { force: payload.progress >= 100 });
                logProgressEvent(message.type, progressData);
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
    [setDeviceAction, clearDeviceAction, flushSdkDebugLogs]
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

  useEffect(() => {
    return () => {
      if (sdkDebugLogFlushTimerRef.current) {
        clearTimeout(sdkDebugLogFlushTimerRef.current);
        sdkDebugLogFlushTimerRef.current = null;
      }
      sdkDebugLogQueueRef.current = [];
    };
  }, []);

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
