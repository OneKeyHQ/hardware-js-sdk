import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UI_RESPONSE } from '@onekeyfe/hd-core';

import { EnterPhase } from '../components/EnterPhase';

import type { CoreApi, UiRequestPassphrase, UiResponseCorrelation } from '@onekeyfe/hd-core';
import type { ReactNode } from 'react';

type PassphraseRequestPayload = UiRequestPassphrase['payload'];

interface DialogState {
  isOpen: boolean;
  sdk?: CoreApi;
  requestPayload?: PassphraseRequestPayload;
  responseCorrelation?: UiResponseCorrelation;
}

interface HardwarePassphraseDialogContextType {
  dialogState: DialogState;
  openDialog: (sdk: CoreApi, requestPayload?: PassphraseRequestPayload) => void;
  closeDialog: () => void;
}

const HardwarePassphraseDialogContext = createContext<
  HardwarePassphraseDialogContextType | undefined
>(undefined);

export const HardwarePassphraseDialogProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    sdk: undefined,
    requestPayload: undefined,
  });

  const openDialog = useCallback((sdk: CoreApi, requestPayload?: PassphraseRequestPayload) => {
    setDialogState({
      isOpen: true,
      sdk,
      requestPayload,
      responseCorrelation: requestPayload?.responseCorrelation,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState(prevState => ({ ...prevState, isOpen: false, sdk: undefined }));
  }, []);

  // 确认输入 passphrase
  const onConfirmPassphrase = useCallback(
    (payload: { passphrase: string }) => {
      dialogState.sdk?.uiResponse({
        type: UI_RESPONSE.RECEIVE_PASSPHRASE,
        payload: {
          value: payload.passphrase,
          passphraseOnDevice: false,
          attachPinOnDevice: false,
        },
        ...(dialogState.responseCorrelation ?? {}),
      });
      closeDialog();
    },
    [closeDialog, dialogState.responseCorrelation, dialogState.sdk]
  );

  // 在设备上输入 passphrase
  const onInputPassphraseOnDeviceCallback = useCallback(() => {
    dialogState.sdk?.uiResponse({
      type: UI_RESPONSE.RECEIVE_PASSPHRASE,
      payload: {
        value: '',
        passphraseOnDevice: true,
        attachPinOnDevice: false,
      },
      ...(dialogState.responseCorrelation ?? {}),
    });
    closeDialog();
  }, [closeDialog, dialogState.responseCorrelation, dialogState.sdk]);

  // 在设备上输入 passphrase 并 attach pin
  const onInputPassphraseOnDeviceAttachPinCallback = useCallback(() => {
    dialogState.sdk?.uiResponse({
      type: UI_RESPONSE.RECEIVE_PASSPHRASE,
      payload: {
        value: '',
        passphraseOnDevice: false,
        attachPinOnDevice: true,
      },
      ...(dialogState.responseCorrelation ?? {}),
    });
    closeDialog();
  }, [closeDialog, dialogState.responseCorrelation, dialogState.sdk]);

  // 取消输入 passphrase
  const onPassphraseCancelCallback = useCallback(() => {
    dialogState.sdk?.cancel();
  }, [dialogState.sdk]);

  const providerValue = useMemo(
    () => ({ dialogState, openDialog, closeDialog }),
    [dialogState, openDialog, closeDialog]
  );

  return (
    <HardwarePassphraseDialogContext.Provider value={providerValue}>
      {children}
      <EnterPhase
        requestPayload={dialogState.requestPayload}
        open={dialogState.isOpen}
        onOpenChange={open => {
          setDialogState(prevState => ({ ...prevState, isOpen: open }));
        }}
        onConfirm={onConfirmPassphrase}
        onSwitchDevice={onInputPassphraseOnDeviceCallback}
        onSwitchDeviceAttachPin={onInputPassphraseOnDeviceAttachPinCallback}
        onCancel={onPassphraseCancelCallback}
      />
    </HardwarePassphraseDialogContext.Provider>
  );
};

export const useHardwarePassphraseDialog = () => {
  const context = useContext(HardwarePassphraseDialogContext);
  if (context === undefined) {
    throw new Error(
      'useHardwarePassphraseDialog must be used within a HardwarePassphraseDialogProvider'
    );
  }
  return context;
};
