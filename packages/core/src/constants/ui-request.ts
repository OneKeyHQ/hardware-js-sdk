import { UI_REQUEST } from '../events/ui-request';

export { UI_REQUEST };

export enum FirmwareUpdateTipMessage {
  CheckLatestUiResource = 'CheckLatestUiResource',

  DownloadLatestUiResource = 'DownloadLatestUiResource',
  DownloadFirmware = 'DownloadFirmware',
  DownloadBleFirmware = 'DownloadBleFirmware',
  DownloadLatestBootloaderResource = 'DownloadLatestBootloaderResource',

  DownloadLatestUiResourceSuccess = 'DownloadLatestUiResourceSuccess',
  DownloadFirmwareSuccess = 'DownloadFirmwareSuccess',
  DownloadBleFirmwareSuccess = 'DownloadBleFirmwareSuccess',
  DownloadLatestBootloaderResourceSuccess = 'DownloadLatestBootloaderResourceSuccess',

  AutoRebootToBootloader = 'AutoRebootToBootloader',
  GoToBootloaderSuccess = 'GoToBootloaderSuccess',
  ConfirmOnDevice = 'ConfirmOnDevice',
  FirmwareEraseSuccess = 'FirmwareEraseSuccess',
  StartTransferData = 'StartTransferData',
  InstallingFirmware = 'InstallingFirmware',
  UpdateBootloader = 'UpdateBootloader',
  UpdateBootloaderSuccess = 'UpdateBootloaderSuccess',
  UpdateSysResource = 'UpdateSysResource',
  UpdateSysResourceSuccess = 'UpdateSysResourceSuccess',
  FirmwareUpdating = 'FirmwareUpdating',
}

export type TFirmwareUpdateTipMessage = `${FirmwareUpdateTipMessage}`;
