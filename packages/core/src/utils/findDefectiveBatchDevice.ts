import { getDeviceType, getDeviceUUID } from './deviceInfoUtils';

import type { Features } from '../types';

/**
 * 检测故障固件设备
 * 检测规则：
 * - 序列号范围：21032200001 到 21032201500
 * - SE版本为 1.1.0.2
 *
 * 对齐之前版本的检测逻辑
 */
export const findDefectiveBatchDevice = (features: Features) => {
  if (!features) return;

  const { serialNo, seVersion } = features;
  if (!serialNo) return;

  const versionNum = +serialNo.slice(5);
  if (Number.isNaN(versionNum)) return;

  return versionNum >= 21032200001 && versionNum <= 21032201500 && seVersion === '1.1.0.2';
};

/**
 * 获取故障设备的详细信息
 */
export const getDefectiveDeviceInfo = (features: Features) => {
  if (!findDefectiveBatchDevice(features)) return null;
  const serialNo = getDeviceUUID(features);
  const deviceType = getDeviceType(features);
  const { seVersion } = features;

  return {
    serialNo,
    seVersion,
    deviceType: deviceType || 'Unknown',
  };
};
