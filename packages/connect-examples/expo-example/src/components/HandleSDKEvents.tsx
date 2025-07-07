import { useCallback, useContext, useState } from 'react';
import {
  CoreMessage,
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
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { ReceivePin } from './ReceivePin';
import { WebUsbAuthorize } from './WebUsbAuthorize';

let registerListener = false;

export default function HandleSDKEvents() {
  const { sdk: SDK, lowLevelSDK: HardwareLowLevelSDK, type } = useContext(HardwareSDKContext);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showWebUsbAuthorize, setShowWebUsbAuthorize] = useState(false);

  // 输入 pin 码的确认回调
  const onConfirmPin = useCallback(
    (payload: string) => {
      SDK?.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload });
      setShowPinInput(false);
    },
    [SDK]
  );

  // 取消输入 pin 码
  const onPinCancelCallback = useCallback(() => {
    SDK?.cancel('pin-cancelled');
  }, [SDK]);

  // input pin on device
  const onInputPinOnDeviceCallback = useCallback(() => {
    SDK?.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
    });
  }, [SDK]);

  const onWebUsbSuccess = useCallback(
    (device: USBDevice) => {
      console.log('webUsbSuccess: ', device);
      SDK?.uiResponse({
        type: UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE,
        payload: {
          deviceId: device.serialNumber ?? '',
        },
      });
    },
    [SDK]
  );

  const onWebUsbCancel = useCallback(() => {
    console.log('webUsbCancel');
  }, []);

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
        // console.log('TopLEVEL EVENT (Api Payload)===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          if (supportInputPinOnSoftware(message.payload.device.features).support) {
            setShowPinInput(true);
          } else {
            onInputPinOnDeviceCallback();
          }
        }
        if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          setTimeout(() => {
            SDK.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: '',
                passphraseOnDevice: true,
                save: false,
              },
            });
          }, 2000);
        }
        if (message.type === UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE) {
          setShowWebUsbAuthorize(true);
        }
      };
      SDK.on(UI_EVENT, uiEventCallback);

      // SDK.on(LOG_EVENT, (message: CoreMessage) => {
      //   if (Array.isArray(message.payload)) {
      //     const msg = message.payload.join(' ');
      //     console.log('receive log event: ', msg);
      //   }
      // });

      SDK.on(FIRMWARE_EVENT, (message: CoreMessage) => {
        // console.log('example get firmware event: ', message);
      });

      SDK.on(DEVICE.FEATURES, (message: CoreMessage) => {
        // console.log('example get features event: ', message);
      });

      SDK.on(DEVICE.CONNECT, (message: CoreMessage) => {
        // console.log('example get connect event: ', message);
      });

      SDK.on(DEVICE.DISCONNECT, (message: CoreMessage) => {
        // console.log('example get disconnect event: ', message);
      });

      registerListener = true;
      console.log('Api payload: register sdk listeners');

      return () => {
        console.log('Api payload: remove all sdk listeners');

        SDK.off(UI_EVENT, uiEventCallback);
        registerListener = false;
      };
    }, [HardwareLowLevelSDK, SDK, onInputPinOnDeviceCallback])
  );

  return (
    <View>
      <ReceivePin
        open={showPinInput}
        onOpenChange={setShowPinInput}
        onConfirm={val => onConfirmPin(val)}
        onSwitchDevice={onInputPinOnDeviceCallback}
        onCancel={onPinCancelCallback}
      />
      <WebUsbAuthorize
        open={showWebUsbAuthorize}
        onOpenChange={setShowWebUsbAuthorize}
        onSuccess={onWebUsbSuccess}
        onCancel={onWebUsbCancel}
      />
    </View>
  );
}
