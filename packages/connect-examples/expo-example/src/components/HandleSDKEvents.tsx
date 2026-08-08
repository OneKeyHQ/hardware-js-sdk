import { useCallback, useContext, useState } from 'react';
import {
  DEVICE,
  FIRMWARE_EVENT,
  LOG_EVENT,
  UI_EVENT,
  UI_REQUEST,
  UI_RESPONSE,
  supportInputPinOnSoftware,
} from '@onekeyfe/hd-core';
import { useFocusEffect } from '@react-navigation/native';
import { View } from 'tamagui';

import HardwareSDKContext from '../provider/HardwareSDKContext';
import { ReceivePin } from './ReceivePin';
import { WebUsbAuthorize } from './WebUsbAuthorize';
import { BluetoothPermission } from './BluetoothPermission';

import type { BluetoothErrorType } from './BluetoothPermission';
import type {
  CoreMessage,
  UiRequestDeviceAction,
  UiRequestPassphrase,
  UiResponseCorrelation,
} from '@onekeyfe/hd-core';

// Type declaration for desktopApi matches the one in BluetoothPermission
declare global {
  interface Window {
    desktopApi?: {
      nobleBle?: {
        checkAvailability: () => Promise<{
          available: boolean;
          state: string;
          unsupported: boolean;
          initialized: boolean;
        }>;
      };
      bluetoothSystem?: {
        openBluetoothSettings: () => void;
        openPrivacySettings: () => void;
      };
    };
  }
}

let registerListener = false;

export default function HandleSDKEvents() {
  const { sdk: SDK, lowLevelSDK: HardwareLowLevelSDK } = useContext(HardwareSDKContext);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showWebUsbAuthorize, setShowWebUsbAuthorize] = useState(false);
  const [webUsbResponseType, setWebUsbResponseType] = useState<
    | typeof UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE
    | typeof UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE
  >(UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE);
  const [showBluetoothPermission, setShowBluetoothPermission] = useState(false);
  const [bluetoothErrorType, setBluetoothErrorType] = useState<BluetoothErrorType>('permission');
  const [pinResponseCorrelation, setPinResponseCorrelation] = useState<UiResponseCorrelation>();

  // 输入 pin 码的确认回调
  const onConfirmPin = useCallback(
    (payload: string) => {
      if (!pinResponseCorrelation) return;
      SDK?.uiResponse({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload,
        ...pinResponseCorrelation,
      });
      setPinResponseCorrelation(undefined);
      setShowPinInput(false);
    },
    [SDK, pinResponseCorrelation]
  );

  // 取消输入 pin 码
  const onPinCancelCallback = useCallback(() => {
    SDK?.cancel('pin-cancelled');
    setPinResponseCorrelation(undefined);
    setShowPinInput(false);
  }, [SDK]);

  // input pin on device
  const onInputPinOnDeviceCallback = useCallback(() => {
    if (!pinResponseCorrelation) return;
    SDK?.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      ...pinResponseCorrelation,
    });
    setPinResponseCorrelation(undefined);
    setShowPinInput(false);
  }, [SDK, pinResponseCorrelation]);

  const onWebUsbSuccess = useCallback(
    (device: USBDevice) => {
      console.log('[connect-example] WebUSB device selected');
      SDK?.uiResponse({
        type: webUsbResponseType,
        payload: {
          deviceId: device.serialNumber ?? '',
        },
      });
    },
    [SDK, webUsbResponseType]
  );

  const onWebUsbCancel = useCallback(() => {
    console.log('webUsbCancel');
  }, []);

  // 蓝牙权限相关回调
  const onBluetoothRequestPermission = useCallback(async () => {
    console.log('Requesting Bluetooth permission...');

    if (typeof window !== 'undefined' && window.desktopApi?.nobleBle) {
      try {
        const status = await window.desktopApi.nobleBle.checkAvailability();
        if (status.available) {
          console.log('Bluetooth permission granted');
          setShowBluetoothPermission(false);
        } else {
          console.log('Bluetooth is unavailable; opening system privacy settings');
          window.desktopApi.bluetoothSystem?.openPrivacySettings();
        }
      } catch (error) {
        console.error('Failed to request Bluetooth permission:', error);
      }
    } else {
      // 回退方案：直接关闭对话框
      console.warn('desktopApi not available - using fallback');
      setShowBluetoothPermission(false);
    }
  }, []);

  const onBluetoothCancel = useCallback(() => {
    console.log('Bluetooth permission cancelled');
    setShowBluetoothPermission(false);
    // 可以在这里发送取消响应给 SDK
    SDK?.cancel('bluetooth-cancelled');
  }, [SDK]);

  useFocusEffect(
    useCallback(() => {
      // 监听 SDK 事件
      if (registerListener) {
        return;
      }
      if (!SDK) return;

      HardwareLowLevelSDK?.addHardwareGlobalEventListener(params => {
        // if (params.event === LOG_EVENT) {
        //   console.log(params.payload.join(' '));
        // }
        SDK.emit?.(params.event, { ...params });
      });

      const uiEventCallback = (message: CoreMessage) => {
        console.log(`[connect-example] UI event: ${message.type}`);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          const requestPayload: UiRequestDeviceAction['payload'] = message.payload;
          const isProtocolV2 =
            requestPayload.device.connectProtocol === 'V2' ||
            requestPayload.interaction?.protocol === 'V2';

          if (isProtocolV2) {
            // Protocol V2 PIN events are non-blocking prompts for device-side input.
            setPinResponseCorrelation(undefined);
            setShowPinInput(false);
          } else if (requestPayload.responseCorrelation) {
            setPinResponseCorrelation(requestPayload.responseCorrelation);
            if (supportInputPinOnSoftware(requestPayload.device.features).support) {
              setShowPinInput(true);
            } else {
              setTimeout(() => {
                SDK.uiResponse({
                  type: UI_RESPONSE.RECEIVE_PIN,
                  payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
                  ...requestPayload.responseCorrelation,
                });
                setPinResponseCorrelation(undefined);
              }, 0);
            }
          }
        }
        if (
          message.type === UI_REQUEST.CLOSE_UI_PIN_WINDOW ||
          message.type === UI_REQUEST.CLOSE_UI_WINDOW
        ) {
          setPinResponseCorrelation(undefined);
          setShowPinInput(false);
        }
        if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          const { responseCorrelation }: UiRequestPassphrase['payload'] = message.payload;
          setTimeout(() => {
            SDK.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: '',
                passphraseOnDevice: true,
                save: false,
              },
              ...responseCorrelation,
            });
          }, 2000);
        }
        if (message.type === UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE) {
          setWebUsbResponseType(UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE);
          setShowWebUsbAuthorize(true);
        }
        if (message.type === UI_REQUEST.REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE) {
          setWebUsbResponseType(UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE);
          setShowWebUsbAuthorize(true);
        }
        if (message.type === UI_REQUEST.BLUETOOTH_POWERED_OFF) {
          setBluetoothErrorType('powered_off');
          setShowBluetoothPermission(true);
        }
        if (message.type === UI_REQUEST.BLUETOOTH_PERMISSION) {
          setBluetoothErrorType('permission');
          setShowBluetoothPermission(true);
        }
        if (message.type === UI_REQUEST.BLUETOOTH_UNSUPPORTED) {
          setBluetoothErrorType('unsupported');
          setShowBluetoothPermission(true);
        }
      };

      console.log('Registering UI_EVENT listener on SDK');
      SDK.on(UI_EVENT, uiEventCallback);

      // SDK.on(LOG_EVENT, (message: CoreMessage) => {
      //   if (Array.isArray(message.payload)) {
      //     const msg = message.payload.join(' ');
      //     console.log('receive log event: ', msg);
      //   }
      // });

      SDK.on(FIRMWARE_EVENT, () => {
        // console.log('example get firmware event: ', message);
      });

      SDK.on(DEVICE.FEATURES, () => {
        // console.log('example get features event: ', message);
      });

      SDK.on(DEVICE.CONNECT, () => {
        // console.log('example get connect event: ', message);
      });

      SDK.on(DEVICE.DISCONNECT, () => {
        // console.log('example get disconnect event: ', message);
      });

      registerListener = true;
      console.log('Api payload: register sdk listeners');

      return () => {
        console.log('Api payload: remove all sdk listeners');

        SDK.off(UI_EVENT, uiEventCallback);
        registerListener = false;
      };
    }, [HardwareLowLevelSDK, SDK])
  );

  const onTestUnexpectedMessage = useCallback(() => {
    SDK?.btcGetAddress('', '', {
      path: "m/44'/0'/0'/0/0",
      showOnOneKey: false,
      useEmptyPassphrase: true,
      passphraseState: undefined,
    });
  }, [SDK]);

  return (
    <View>
      <ReceivePin
        open={showPinInput}
        onOpenChange={setShowPinInput}
        onConfirm={val => onConfirmPin(val)}
        onSwitchDevice={onInputPinOnDeviceCallback}
        onCancel={onPinCancelCallback}
        onTestUnexpectedMessage={onTestUnexpectedMessage}
      />
      <WebUsbAuthorize
        open={showWebUsbAuthorize}
        onOpenChange={setShowWebUsbAuthorize}
        onSuccess={onWebUsbSuccess}
        onCancel={onWebUsbCancel}
      />
      <BluetoothPermission
        open={showBluetoothPermission}
        errorType={bluetoothErrorType}
        onOpenChange={setShowBluetoothPermission}
        onRequestPermission={onBluetoothRequestPermission}
        onCancel={onBluetoothCancel}
      />
    </View>
  );
}
