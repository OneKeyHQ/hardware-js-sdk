import { memo, useContext, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/core';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Button, Dialog, Stack, Text, Unspaced } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import HardwareSDKContext from '../../provider/HardwareSDKContext';

let registerListener = false;
function FirmwareUpdateEventView({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sdk: SDK, lowLevelSDK: HardwareLowLevelSDK, type } = useContext(HardwareSDKContext);

  const focus = useIsFocused();
  const focusRef = useRef<boolean>(false);

  const [updateState, setUpdateState] = useState<{
    progress: number;
    message: string;
  }>({
    progress: 1,
    message: '',
  });

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    setUpdateState(pre => ({
      ...pre,
      progress: 1,
    }));
  }, [open]);

  useEffect(() => {
    // 监听 SDK 事件
    if (registerListener) {
      return;
    }
    if (!SDK) return;

    SDK.on(UI_EVENT, (message: CoreMessage) => {
      if (!focusRef.current) return;
      console.log('TopLEVEL EVENT ===>>>>: ', message);
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
      }
      if (message.type === UI_REQUEST.FIRMWARE_TIP) {
        const tip = message.payload.data.message;
        let newMessage = '';
        switch (tip) {
          case 'CheckLatestUiResource':
            newMessage = '检查最新系统资源...';
            break;
          case 'DownloadLatestUiResource':
            newMessage = '下载最新系统资源...';
            break;
          case 'DownloadLatestUiResourceSuccess':
            newMessage = '下载最新系统资源成功';
            break;
          case 'AutoRebootToBootloader':
            newMessage = '重启到 Bootloader...';
            break;
          case 'GoToBootloaderSuccess':
            newMessage = '等待开始更新...';
            break;
          case 'ConfirmOnDevice':
            newMessage = '确认设备升级...';
            break;
          case 'FirmwareEraseSuccess':
            newMessage = '擦除固件成功';
            break;
          case 'StartTransferData':
            newMessage = '正在传输数据...';
            break;
          case 'InstallingFirmware':
            newMessage = '正在安装固件...';
            break;
          case 'UpdateBootloader':
            newMessage = '升级 Bootloader...';
            break;
          case 'UpdateBootloaderSuccess':
            newMessage = '升级 Bootloader 成功';
            break;
          case 'UpdateSysResource':
            newMessage = '升级系统资源...';
            break;
          case 'UpdateSysResourceSuccess':
            newMessage = '升级系统资源成功';
            break;
          default:
            newMessage = tip;
            break;
        }

        setUpdateState(pre => ({
          ...pre,
          message: newMessage,
        }));
      }
      if (message.type === UI_REQUEST.FIRMWARE_PROGRESS) {
        setUpdateState(pre => ({
          ...pre,
          progress: message.payload.progress,
        }));
      }
    });
    registerListener = true;
  }, [HardwareLowLevelSDK, SDK]);

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
          <Dialog.Title>正在升级</Dialog.Title>

          <Stack flexDirection="column" flex={1} justifyContent="center" alignItems="center">
            <Text height={30}>{updateState.message}</Text>
            <Text height={30}>进度 {updateState.progress} %</Text>
          </Stack>

          <Dialog.Close asChild>
            <Button>Close</Button>
          </Dialog.Close>

          <Unspaced>
            <Dialog.Close asChild>
              <Button position="absolute" top="$3" right="$3" circular icon={X} />
            </Dialog.Close>
          </Unspaced>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export const FirmwareUpdateEvent = memo(FirmwareUpdateEventView);
FirmwareUpdateEvent.displayName = 'FirmwareUpdateEvent';
