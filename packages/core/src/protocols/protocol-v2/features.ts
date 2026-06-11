import { DevSEState, DevSeType } from '@onekeyfe/hd-transport';

import type { DevGetDeviceInfo, DevSEInfo, ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';
import type { DeviceCommands } from '../../device/DeviceCommands';

// 单源类型：直接使用 hd-transport 生成的 ProtocolV2DeviceInfo / DevSEInfo /
// DevFirmwareImageInfo（与 firmware-pro2 proto 一致），不再维护手写副本。
export type { ProtocolV2DeviceInfo };
export type { DevFirmwareImageInfo as ProtocolV2FirmwareImageInfo } from '@onekeyfe/hd-transport';
export type { DevSEInfo as ProtocolV2SEInfo } from '@onekeyfe/hd-transport';

export type ProtocolV2SeStateLabel = 'BOOT' | 'APP_FACTORY' | 'APP';

/**
 * 传输层解码会把 proto 枚举输出为名称字符串（见 hd-transport 的 messageToJSON），
 * 但生成类型声明为数值枚举；这里统一兼容两种形态。
 */
const normalizeEnumValue = <T extends Record<string | number, string | number>>(
  enumObject: T,
  value: number | string | null | undefined
): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  const label = enumObject[value];
  return typeof label === 'string' ? label : null;
};

/**
 * DevSEInfo.state → 可读标签。SDK 内唯一的 SE 状态映射实现，
 * deviceProfile 与 legacy Features 兼容视图都从这里取。
 */
export const getProtocolV2SeState = (se?: DevSEInfo): ProtocolV2SeStateLabel | null => {
  const label = normalizeEnumValue(DevSEState, se?.state);
  switch (label) {
    case 'BOOT':
      return 'BOOT';
    case 'APP_FACTORY':
      return 'APP_FACTORY';
    case 'APP':
      return 'APP';
    default:
      return null;
  }
};

/**
 * DevSEInfo.type → 可读标签（如 'THD89'）。legacy Features 兼容视图的
 * onekey_se_type 字段从这里取。
 */
export const getProtocolV2SeType = (se?: DevSEInfo): string | null =>
  normalizeEnumValue(DevSeType, se?.type);

export const PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    bt: true,
    status: true,
  },
  types: {
    version: true,
    specific: true,
  },
};

/**
 * 轻量状态刷新请求（每次 run 前使用）。
 *
 * status 提供 init_states / label / passphrase_protection 等会在设备端变化的字段；
 * hw / bt 提供 serialNo / bleName 等身份字段——applyProfileUpdate 对顶层字段是整体
 * 覆盖语义，缺少 hw/bt 会把已有 profile 的身份字段清空。不含 fw/SE targets，
 * 单帧请求开销很小。
 */
export const PROTOCOL_V2_STATUS_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    bt: true,
    status: true,
  },
  types: {
    version: true,
    specific: true,
  },
};

export const PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    bt: true,
    se1: true,
    se2: true,
    se3: true,
    se4: true,
    status: true,
  },
  types: {
    version: true,
    specific: true,
  },
};

export const PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    bt: true,
    se1: true,
    se2: true,
    se3: true,
    se4: true,
    status: true,
  },
  types: {
    version: true,
    build_id: true,
    hash: true,
    specific: true,
  },
};

export const PROTOCOL_V2_DEVICE_INFO_REQUEST = PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST;
export const PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS = 10 * 1000;

export async function requestProtocolV2DeviceInfo({
  commands,
  timeoutMs = PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  request = PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
  request?: DevGetDeviceInfo;
}): Promise<ProtocolV2DeviceInfo> {
  const { message } = await commands.typedCall('DevGetDeviceInfo', 'DeviceInfo', request, {
    timeoutMs,
  });
  // 'DeviceInfo' 在生成类型里是 V1 DeviceInfo | ProtocolV2DeviceInfo 的合并；
  // DevGetDeviceInfo 是 V2-only 消息，这里收窄到 V2 形态。
  return message as ProtocolV2DeviceInfo;
}
