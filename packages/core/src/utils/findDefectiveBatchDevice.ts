import type { Features } from '../types';

export const findDefectiveBatchDevice = (features: Features) => {
  if (!features) return;
  const { onekey_serial: onekeySerial, se_ver: seVer } = features;
  if (!onekeySerial) return;
  const versionNum = +onekeySerial.slice(5);
  if (Number.isNaN(versionNum)) return;
  return versionNum >= 21032200001 && versionNum <= 21032201500 && seVer === '1.1.0.2';
};
