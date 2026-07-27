import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UI_RESPONSE, supportInputPinOnSoftware } from '@onekeyfe/hd-core';

import { ReceivePin } from '../components/ReceivePin';

import type { Features } from '@onekeyfe/hd-core';
import type { ReactNode } from 'react';

interface DialogState {
  isOpen: boolean;
  sdk: any;
  payload?: any;
}

interface HardwareInputPinDialogContextType {
  dialogState: DialogState;
  openDialog: (sdk: any, features?: Features) => void;
  closeDialog: () => void;
}

const HardwareInputPinDialogContext = createContext<HardwareInputPinDialogContextType | undefined>(
  undefined
);

export const HardwareInputPinDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    sdk: undefined,
  });

  // input pin on device
  const onInputPinOnDeviceCallback = useCallback(() => {
    dialogState.sdk?.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
    });
  }, [dialogState.sdk]);

  const openDialog = useCallback(
    (sdk: any, features?: Features, payload?: any) => {
      if (supportInputPinOnSoftware(features).support) {
        setDialogState({ isOpen: true, sdk, payload });
      } else {
        onInputPinOnDeviceCallback();
      }
    },
    [onInputPinOnDeviceCallback]
  );

  const closeDialog = useCallback(() => {
    setDialogState(prevState => ({ ...prevState, isOpen: false, sdk: undefined }));
  }, []);

  // 输入 pin 码的确认回调
  const onConfirmPin = useCallback(
    (payload: string) => {
      dialogState.sdk?.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload });
      closeDialog();
    },
    [closeDialog, dialogState.sdk]
  );

  // 取消输入 pin 码
  const onPinCancelCallback = useCallback(() => {
    dialogState.sdk?.cancel();
  }, [dialogState.sdk]);

  const providerValue = useMemo(
    () => ({ dialogState, openDialog, closeDialog }),
    [dialogState, openDialog, closeDialog]
  );

  return (
    <HardwareInputPinDialogContext.Provider value={providerValue}>
      {children}
      <ReceivePin
        open={dialogState.isOpen}
        payload={dialogState.payload}
        onOpenChange={open => {
          setDialogState(prevState => ({ ...prevState, isOpen: open }));
        }}
        onConfirm={val => onConfirmPin(val)}
        onSwitchDevice={onInputPinOnDeviceCallback}
        onCancel={onPinCancelCallback}
        onTestUnexpectedMessage={() => {}}
      />
    </HardwareInputPinDialogContext.Provider>
  );
};

export const useHardwareInputPinDialog = () => {
  const context = useContext(HardwareInputPinDialogContext);
  if (context === undefined) {
    throw new Error('useEventDialog must be used within an EventDialogProvider');
  }
  return context;
};
