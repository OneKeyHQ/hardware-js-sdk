import { DataManager } from '../../data-manager';
import type { Features } from '../../types';

export const getFirmwareReleaseInfo = (features: Features) => {
  const firmwareStatus = DataManager.getFirmwareStatus(features);
  const changelog = DataManager.getFirmwareChangelog(features);
  const release = DataManager.getFirmwareLatestRelease(features);
  return {
    status: firmwareStatus,
    changelog,
    release,
  };
};

export const getBleFirmwareReleaseInfo = (features: Features) => {
  const firmwareStatus = DataManager.getBLEFirmwareStatus(features);
  const changelog = DataManager.getBleFirmwareChangelog(features);
  const release = DataManager.getBleFirmwareLatestRelease(features);
  return {
    status: firmwareStatus,
    changelog,
    release,
  };
};
