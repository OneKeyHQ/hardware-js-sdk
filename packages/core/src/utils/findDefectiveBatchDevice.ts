import { EDeviceType } from '@onekeyfe/hd-shared';
import type { Features } from '../types';
import { getDeviceUUID, getDeviceType } from './deviceInfoUtils';

/**
 * 检测故障固件设备
 * 检测规则：
 * - 序列号范围：Bixin21032200001 到 Bixin21032201500
 * - SE版本为 1.1.0.2
 * - 设备类型为 classic
 */
export const findDefectiveBatchDevice = (features: Features) => {
  if (!features) return false;

  // 获取序列号
  const serialNo = getDeviceUUID(features);
  if (!serialNo) return false;

  // 获取设备类型
  const deviceType = getDeviceType(features);
  if (deviceType !== EDeviceType.Classic) return false;

  // 检查序列号是否匹配模式 Bixin21032200001 到 Bixin21032201500
  const serialPattern = /^[Bb]ixin(\d{11})$/i;
  const match = serialNo.match(serialPattern);
  if (!match) return false;

  const versionNum = parseInt(match[1], 10);
  if (Number.isNaN(versionNum)) return false;

  // 检查序列号范围
  const isInRange = versionNum >= 21032200001 && versionNum <= 21032201500;
  if (!isInRange) return false;

  // 检查SE版本 - 支持多个SE版本字段
  const seVersion =
    features.se_ver ||
    features.onekey_se01_version ||
    features.onekey_se02_version ||
    features.onekey_se03_version ||
    features.onekey_se04_version;

  return seVersion === '1.1.0.2';
};

/**
 * 获取故障设备的详细信息
 */
export const getDefectiveDeviceInfo = (features: Features) => {
  if (!findDefectiveBatchDevice(features)) return null;

  const serialNo = getDeviceUUID(features);
  const deviceType = getDeviceType(features);
  const seVersion =
    features.se_ver ||
    features.onekey_se01_version ||
    features.onekey_se02_version ||
    features.onekey_se03_version ||
    features.onekey_se04_version;

  return {
    serialNo,
    seVersion,
    deviceType: deviceType || 'Unknown',
  };
};
