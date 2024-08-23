import { memo, useCallback, useContext, useEffect, useState } from 'react';
import { CoreMessage, UI_EVENT, UI_REQUEST } from '@onekeyfe/hd-core';
import { Dialog, Stack, Text, Unspaced } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { useFocusEffect } from '@react-navigation/native';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { Button } from '../../components/ui/Button';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';

let registerListener = false;
function FirmwareUpdateEventView({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const intl = useIntl();
  const { sdk: SDK, lowLevelSDK: HardwareLowLevelSDK, type } = useContext(HardwareSDKContext);
  const { openDialog } = useHardwareInputPinDialog();

  const [updateState, setUpdateState] = useState<{
    progress: number;
    message: string;
  }>({
    progress: 0,
    message: '',
  });

  useEffect(() => {
    setUpdateState(pre => ({
      ...pre,
      progress: 0,
    }));
  }, [open]);

  const getMessage = useCallback(
    (tip: string) => {
      let newMessage = '';
      switch (tip) {
        case 'CheckLatestUiResource':
          newMessage = intl.formatMessage({ id: 'message__check_latest_ui_resource' });
          break;
        case 'DownloadLatestUiResource':
          newMessage = intl.formatMessage({ id: 'message__download_latest_ui_resource' });
          break;
        case 'DownloadLatestUiResourceSuccess':
          newMessage = intl.formatMessage({ id: 'message__download_latest_ui_resource_success' });
          break;
        case 'AutoRebootToBootloader':
          newMessage = intl.formatMessage({ id: 'message__reboot_to_bootloader' });
          break;
        case 'GoToBootloaderSuccess':
          newMessage = intl.formatMessage({ id: 'message__wait_begin_update' });
          break;
        case 'ConfirmOnDevice':
          newMessage = intl.formatMessage({ id: 'message__confirm_on_device' });
          break;
        case 'FirmwareEraseSuccess':
          newMessage = intl.formatMessage({ id: 'message__firmware_erase_success' });
          break;
        case 'StartTransferData':
          newMessage = intl.formatMessage({ id: 'message__firmware_start_transfer' });
          break;
        case 'InstallingFirmware':
          newMessage = intl.formatMessage({ id: 'message__firmware_installing' });
          break;
        case 'UpdateBootloader':
          newMessage = intl.formatMessage({ id: 'message__bootloader_update' });
          break;
        case 'UpdateBootloaderSuccess':
          newMessage = intl.formatMessage({ id: 'message__bootloader_update_success' });
          break;
        case 'UpdateSysResource':
          newMessage = intl.formatMessage({ id: 'message__sys_resource_update' });
          break;
        case 'UpdateSysResourceSuccess':
          newMessage = intl.formatMessage({ id: 'message__sys_resource_update_success' });
          break;
        default:
          newMessage = tip;
          break;
      }

      return newMessage;
    },
    [intl]
  );

  useFocusEffect(
    useCallback(() => {
      // 监听 SDK 事件
      if (registerListener) {
        return;
      }
      if (!SDK) return;

      const uiEventCallback = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT (Firmware Update)===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(SDK, message.payload.device.features);
        }
        if (message.type === UI_REQUEST.FIRMWARE_TIP) {
          const tip = message.payload.data.message;

          setUpdateState({
            progress: 0,
            message: getMessage(tip),
          });
        }
        if (message.type === UI_REQUEST.FIRMWARE_PROGRESS) {
          setUpdateState(pre => ({
            ...pre,
            progress: message.payload.progress,
          }));
        }
      };

      SDK.on(UI_EVENT, uiEventCallback);
      registerListener = true;
      console.log('Firmware Update: register sdk listeners');

      return () => {
        console.log('Firmware Update: remove all sdk listeners');
        SDK.off(UI_EVENT, uiEventCallback);
        registerListener = false;
      };
    }, [SDK, getMessage, openDialog])
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal padding="$4">
        <Dialog.Overlay key="overlay" backgroundColor="$bgBackdrop" />
        <Dialog.Content
          key="content"
          minWidth="100%"
          minHeight={320}
          $gtXs={{
            minWidth: 480,
          }}
        >
          <Dialog.Title>{intl.formatMessage({ id: 'title__updating' })}</Dialog.Title>

          <Stack flexDirection="column" flex={1} justifyContent="center" alignItems="center">
            <Text height={30}>{updateState.message}</Text>
            {updateState.progress > 0 && (
              <Text height={30}>
                {intl.formatMessage({ id: 'label__progress' })} {updateState.progress} %
              </Text>
            )}
          </Stack>

          <Dialog.Close asChild>
            <Button size="large">{intl.formatMessage({ id: 'action__close' })}</Button>
          </Dialog.Close>

          <Unspaced>
            <Dialog.Close asChild>
              <Button
                variant="tertiary"
                circular
                width={32}
                height={32}
                position="absolute"
                top="$3"
                right="$3"
              >
                <X />
              </Button>
            </Dialog.Close>
          </Unspaced>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export const FirmwareUpdateEvent = memo(FirmwareUpdateEventView);
FirmwareUpdateEvent.displayName = 'FirmwareUpdateEvent';
