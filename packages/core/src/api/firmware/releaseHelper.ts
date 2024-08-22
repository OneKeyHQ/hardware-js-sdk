import { DataManager } from '../../data-manager';
import { DeviceModelToTypes, type Features } from '../../types';
import {
  checkNeedUpdateBootForClassicAndMini,
  checkNeedUpdateBootForTouch,
  getDeviceType,
} from '../../utils';

export const getFirmwareReleaseInfo = (features: Features) => {
  const firmwareStatus = DataManager.getFirmwareStatus(features);
  const changelog = DataManager.getFirmwareChangelog(features);
  const release = DataManager.getFirmwareLatestRelease(features);
  const bootloaderMode = !!features.bootloader_mode;
  return {
    status: firmwareStatus,
    changelog,
    release,
    bootloaderMode,
  };
};

export const getBleFirmwareReleaseInfo = (features: Features) => {
  const firmwareStatus = DataManager.getBLEFirmwareStatus(features);
  const changelog = DataManager.getBleFirmwareChangelog(features);
  const release = DataManager.getBleFirmwareLatestRelease(features);
  const bootloaderMode = !!features.bootloader_mode;
  return {
    status: firmwareStatus,
    changelog,
    release,
    bootloaderMode,
  };
};

export const getBootloaderReleaseInfo = (
  features: Features,
  willUpdateFirmwareVersion?: string
) => {
  const release = DataManager.getFirmwareLatestRelease(features);
  const changelog = [release?.bootloaderChangelog].filter(
    item =>
      item != null &&
      typeof item === 'object' &&
      Object.prototype.hasOwnProperty.call(item, 'zh-CN') &&
      Object.prototype.hasOwnProperty.call(item, 'en-US')
  );

  const bootloaderMode = !!features.bootloader_mode;

  let shouldUpdate = false;

  const deviceType = getDeviceType(features);
  // classic mini classic1s
  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    shouldUpdate = !!checkNeedUpdateBootForClassicAndMini(features, willUpdateFirmwareVersion);
  } else if (DeviceModelToTypes.model_touch.includes(deviceType)) {
    shouldUpdate = checkNeedUpdateBootForTouch(features);
  }

  return {
    status: shouldUpdate ? 'outdated' : 'valid',
    changelog,
    release,
    bootloaderMode,
  };
};
