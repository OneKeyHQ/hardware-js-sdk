import { FIRMWARE_TIP_MESSAGE_IDS } from './firmwareUpdateMessages';

describe('firmware update status messages', () => {
  test('maps every status emitted by Protocol V2 firmwareUpdateV4', () => {
    expect(FIRMWARE_TIP_MESSAGE_IDS).toMatchObject({
      StartDownloadFirmware: 'message__firmware_preparing',
      FinishDownloadFirmware: 'message__firmware_download_ready',
      AutoRebootToBootloader: 'message__reboot_to_bootloader',
      GoToBootloaderSuccess: 'message__wait_begin_update',
      StartTransferData: 'message__firmware_start_transfer',
      ConfirmOnDevice: 'message__confirm_on_device',
      FirmwareUpdating: 'message__firmware_updating',
      SwitchFirmwareReconnectDevice: 'message__firmware_reconnecting',
      FirmwareUpdateCompleted: 'message__firmware_update_completed',
    });
  });
});
