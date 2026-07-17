import { DeviceSEState, DeviceSeType } from '@onekeyfe/hd-transport';

import type {
  DeviceInfoGet,
  DeviceSEInfo,
  DeviceStatus,
  ProtocolV2DeviceInfo,
} from '@onekeyfe/hd-transport';
import type { DeviceCommands } from '../../device/DeviceCommands';

// 单源类型：直接使用 hd-transport 生成的 ProtocolV2DeviceInfo / DeviceSEInfo /
// DeviceFirmwareImageInfo（与 firmware-pro2 proto 一致），不再维护手写副本。
export type { ProtocolV2DeviceInfo };
export type { DeviceFirmwareImageInfo as ProtocolV2FirmwareImageInfo } from '@onekeyfe/hd-transport';
export type { DeviceSEInfo as ProtocolV2SEInfo } from '@onekeyfe/hd-transport';

export type ProtocolV2SeStateLabel = 'BOOT' | 'APP_FACTORY' | 'APP';

/**
 * 传输层沿用历史 decode 语义：单值 proto enum 输出为名称字符串。
 * 这里按 SDK decode 后的字符串语义处理，同时接受数字枚举，便于低层调用复用。
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
 * DeviceSEInfo.state → 可读标签。SDK 内唯一的 SE 状态映射实现，
 * DeviceProfile 与标准 Features 构建都从这里取。
 */
export const getProtocolV2SeState = (se?: DeviceSEInfo): ProtocolV2SeStateLabel | null => {
  const label = normalizeEnumValue(DeviceSEState, se?.state);
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
 * DeviceSEInfo.type → 可读标签（如 'THD89'）。DeviceProfile / Features
 * 的 SE 类型归一化从这里取。
 */
export const getProtocolV2SeType = (se?: DeviceSEInfo): string | null =>
  normalizeEnumValue(DeviceSeType, se?.type);

/**
 * 兼容尚未提供显式 runtime mode 的 Protocol V2 固件。
 *
 * 当前 romloader 只上报 hw、fw.romloader 和 fw.bootloader；bootloader
 * 还会上报 application/application_data、coprocessor 或 SE 信息。
 */
export const isProtocolV2RomloaderDeviceInfo = (
  deviceInfo?: ProtocolV2DeviceInfo | null,
  deviceStatus?: DeviceStatus | null
) =>
  !!deviceInfo &&
  deviceStatus == null &&
  deviceInfo.fw?.romloader != null &&
  deviceInfo.fw?.application == null &&
  deviceInfo.fw?.application_data == null &&
  deviceInfo.coprocessor == null &&
  deviceInfo.se1 == null &&
  deviceInfo.se2 == null &&
  deviceInfo.se3 == null &&
  deviceInfo.se4 == null;

export const isProtocolV2BootloaderDeviceInfo = (
  deviceInfo?: ProtocolV2DeviceInfo | null,
  deviceStatus?: DeviceStatus | null
) =>
  !!deviceInfo &&
  deviceStatus == null &&
  !isProtocolV2RomloaderDeviceInfo(deviceInfo, deviceStatus);

export const PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    coprocessor: true,
  },
  types: {
    version: true,
    specific: true,
  },
};

/**
 * 轻量状态刷新请求（每次 run 前使用）。
 *
 * status 提供 init_states / passphrase_enabled 等会在设备端变化的字段；
 * hw / coprocessor 提供 serialNo / bleName 等身份字段；不含 fw/SE targets，单帧请求开销很小。
 */
export const PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST = {
  targets: {
    hw: true,
    fw: true,
    coprocessor: true,
    se1: true,
    se2: true,
    se3: true,
    se4: true,
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
    coprocessor: true,
    se1: true,
    se2: true,
    se3: true,
    se4: true,
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
  request?: DeviceInfoGet;
}): Promise<ProtocolV2DeviceInfo> {
  const { message } = await commands.typedCall('DeviceInfoGet', 'DeviceInfo', request, {
    timeoutMs,
  });
  // 'DeviceInfo' 在生成类型里是 V1 DeviceInfo | ProtocolV2DeviceInfo 的合并；
  // DeviceInfoGet 是 V2-only 消息，这里收窄到 V2 形态。
  return message as ProtocolV2DeviceInfo;
}

export async function requestProtocolV2DeviceStatus({
  commands,
}: {
  commands: DeviceCommands;
}): Promise<DeviceStatus> {
  const { message } = await commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
  return message;
}
