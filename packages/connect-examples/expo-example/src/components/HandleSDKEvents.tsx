import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  CoreMessage,
  DEVICE,
  FIRMWARE_EVENT,
  UI_EVENT,
  UI_REQUEST,
  UI_RESPONSE,
} from '@onekeyfe/hd-core';

import { useIsFocused } from '@react-navigation/native';
import { View } from 'tamagui';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { ReceivePin } from './ReceivePin';

let registerListener = false;

export default function HandleSDKEvents() {
  const { sdk: SDK, lowLevelSDK: HardwareLowLevelSDK, type } = useContext(HardwareSDKContext);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');

  const focus = useIsFocused();
  const focusRef = useRef<boolean>(false);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    // 监听 SDK 事件
    if (registerListener) {
      return;
    }
    if (!SDK) return;

    HardwareLowLevelSDK?.addHardwareGlobalEventListener(params => {
      SDK.emit?.(params.event, { ...params });
    });

    SDK.on(UI_EVENT, (message: CoreMessage) => {
      if (!focusRef.current) return;
      console.log('TopLEVEL EVENT ===>>>>: ', message);
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        // setShowPinInput(true);
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
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
    });

    // SDK.on(LOG_EVENT, (message: CoreMessage) => {
    //   if (Array.isArray(message.payload)) {
    //     const msg = message.payload.join(' ');
    //     console.log('receive log event: ', msg);
    //   }
    // });

    SDK.on(FIRMWARE_EVENT, (message: CoreMessage) => {
      console.log('example get firmware event: ', message);
    });

    SDK.on(DEVICE.FEATURES, (message: CoreMessage) => {
      console.log('example get features event: ', message);
    });

    SDK.on(DEVICE.CONNECT, (message: CoreMessage) => {
      console.log('example get connect event: ', message);
    });

    SDK.on(DEVICE.DISCONNECT, (message: CoreMessage) => {
      console.log('example get disconnect event: ', message);
    });
    registerListener = true;

    return () => {
      registerListener = false;
      SDK.removeAllListeners();
    };
  }, [SDK, HardwareLowLevelSDK, focus]);

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

  return (
    <View>
      {showPinInput && (
        <ReceivePin
          value={pinValue}
          onChange={val => setPinValue(val)}
          onConfirm={val => onConfirmPin(val)}
          onCancel={onPinCancelCallback}
        />
      )}
    </View>
  );
}
