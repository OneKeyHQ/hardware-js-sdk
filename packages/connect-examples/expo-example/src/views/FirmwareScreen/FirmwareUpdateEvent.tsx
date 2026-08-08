import { memo, useCallback, useContext, useEffect, useState } from 'react';
import { UI_EVENT, UI_REQUEST } from '@onekeyfe/hd-core';
import { Dialog, Stack, Text, XStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { useFocusEffect } from '@react-navigation/native';

import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import { useMedia } from '../../provider/MediaProvider';
import { FIRMWARE_TIP_MESSAGE_IDS } from './firmwareUpdateMessages';

import type { CoreMessage, IFirmwareUpdateTipMessage } from '@onekeyfe/hd-core';

function FirmwareUpdateEventView({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const intl = useIntl();
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { openDialog } = useHardwareInputPinDialog();
  const media = useMedia();

  const [updateState, setUpdateState] = useState<{
    progress: number;
    message: string;
  }>({
    progress: 0,
    message: intl.formatMessage({ id: 'message__firmware_preparing' }),
  });

  useEffect(() => {
    if (open) {
      setUpdateState({
        message: intl.formatMessage({ id: 'message__firmware_preparing' }),
        progress: 0,
      });
    }
  }, [intl, open]);

  const getMessage = useCallback(
    (tip: IFirmwareUpdateTipMessage) => {
      const messageId = FIRMWARE_TIP_MESSAGE_IDS[tip];
      return messageId ? intl.formatMessage({ id: messageId }) : tip;
    },
    [intl]
  );

  useFocusEffect(
    useCallback(() => {
      if (!SDK) return;

      const uiEventCallback = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT (Firmware Update)===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(SDK, message.payload.device.features);
        }
        if (message.type === UI_REQUEST.FIRMWARE_TIP) {
          const tip = message.payload.data.message as IFirmwareUpdateTipMessage;

          setUpdateState(previous => ({
            ...previous,
            message: getMessage(tip),
          }));
        }
        if (message.type === UI_REQUEST.FIRMWARE_PROGRESS) {
          setUpdateState(previous => ({
            ...previous,
            progress: Math.max(0, Math.min(100, message.payload.progress)),
          }));
        }
      };

      SDK.on(UI_EVENT, uiEventCallback);
      console.log('Firmware Update: register sdk listeners');

      return () => {
        console.log('Firmware Update: remove sdk listener');
        SDK.off(UI_EVENT, uiEventCallback);
      };
    }, [SDK, getMessage, openDialog])
  );

  const minWidth = media.gtXs ? 480 : '100%';
  const progressWidth = `${updateState.progress}%`;
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      // 固件方法仍在运行时，关闭弹窗不会取消设备操作，因而禁止误关闭。
      if (nextOpen) onOpenChange(true);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal padding="$4">
        <Dialog.Overlay key="overlay" backgroundColor="$bgBackdrop" />
        <Dialog.Content key="content" minWidth={minWidth} minHeight={240} gap="$4">
          <Dialog.Title>{intl.formatMessage({ id: 'title__updating' })}</Dialog.Title>
          <Dialog.Description>
            {intl.formatMessage({ id: 'message__firmware_keep_connected' })}
          </Dialog.Description>

          <Stack flex={1} justifyContent="center" gap="$3">
            <Text minHeight={30} fontSize={18} fontWeight="bold">
              {updateState.message}
            </Text>
            <Stack height={8} backgroundColor="$bgHover" borderRadius="$4" overflow="hidden">
              <Stack height="100%" width={progressWidth} backgroundColor="$textInfo" />
            </Stack>
            <XStack justifyContent="space-between">
              <Text>{intl.formatMessage({ id: 'label__progress' })}</Text>
              <Text fontWeight="bold">{updateState.progress}%</Text>
            </XStack>
          </Stack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export const FirmwareUpdateEvent = memo(FirmwareUpdateEventView);
FirmwareUpdateEvent.displayName = 'FirmwareUpdateEvent';
