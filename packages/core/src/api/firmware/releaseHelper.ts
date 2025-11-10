import { DataManager } from '../../data-manager';
import { DeviceModelToTypes, type Features } from '../../types';
import {
  checkNeedUpdateBootForClassicAndMini,
  checkNeedUpdateBootForTouch,
  getDeviceType,
} from '../../utils';

import type { EFirmwareType } from '@onekeyfe/hd-shared';

export const getFirmwareReleaseInfo = (features: Features, firmwareType: EFirmwareType) => {
  const firmwareStatus = DataManager.getFirmwareStatus(features, firmwareType);
  const changelog = DataManager.getFirmwareChangelog(features, firmwareType);
  const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
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

export const getBootloaderReleaseInfo = ({
  features,
  willUpdateFirmwareVersion,
  firmwareType,
}: {
  features: Features;
  willUpdateFirmwareVersion?: string;
  firmwareType: EFirmwareType;
}) => {
  const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
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
    shouldUpdate = !!checkNeedUpdateBootForClassicAndMini({
      features,
      willUpdateFirmware: willUpdateFirmwareVersion,
      firmwareType,
    });
  } else if (DeviceModelToTypes.model_touch.includes(deviceType)) {
    shouldUpdate = checkNeedUpdateBootForTouch(features, firmwareType);
  }

  return {
    status: shouldUpdate ? 'outdated' : 'valid',
    changelog,
    release,
    bootloaderMode,
    shouldUpdate,
  };
};
