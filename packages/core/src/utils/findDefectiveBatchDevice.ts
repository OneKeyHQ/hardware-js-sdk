import type { Features } from '../types';
import {
  getHardwareInfoFromFeatures,
  getSeInfoFromFeatures,
} from '@onekeyfe/hd-shared/src/onekeyInfoUtils';

export const findDefectiveBatchDevice = (features: Features) => {
  if (!features) return;
  const { serialNumber: onekeySerial } = getHardwareInfoFromFeatures(features);
  const { se01Version } = getSeInfoFromFeatures(features);
  if (!onekeySerial) return;
  const versionNum = +onekeySerial.slice(5);
  if (Number.isNaN(versionNum)) return;
  return versionNum >= 21032200001 && versionNum <= 21032201500 && se01Version === '1.1.0.2';
};
