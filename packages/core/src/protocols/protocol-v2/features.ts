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
 * DeviceProfile 与标准 Features 构建都从这里取。
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
 * DevSEInfo.type → 可读标签（如 'THD89'）。DeviceProfile / Features
 * 的 SE 类型归一化从这里取。
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
 * hw / bt 提供 serialNo / bleName 等身份字段；不含 fw/SE targets，单帧请求开销很小。
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

/**
 * 临时开关（默认关闭）：当前正式链路直接调用 DevGetDeviceInfo。
 * 仅当 Pro2 测试固件 / 早期工程板尚未实现 DevGetDeviceInfo 时，才显式开启 mock。
 * 开启时跳过 wire 调用，直接返回 mock DeviceInfo；
 * DevGetDeviceInfo 尚未返回的字段保持为空，不再用 transport path 兜底成设备身份。
 *
 * 固件实现 DevGetDeviceInfo 稳定后：删除开关与 mock。
 * 注意：开启期间 FirmwareUpdateV4 的“升级完成版本比对”拿到的也是 mock 版本，
 * 不能作为升级成功的依据。
 */
let protocolV2DeviceInfoMockEnabled = false;

export const setProtocolV2DeviceInfoMock = (enabled: boolean) => {
  protocolV2DeviceInfoMockEnabled = enabled;
};

export const isProtocolV2DeviceInfoMockEnabled = () => protocolV2DeviceInfoMockEnabled;

/** 每次调用返回新对象，避免调用方原地修改互相污染。 */
export const buildMockProtocolV2DeviceInfo = (): ProtocolV2DeviceInfo => ({
  protocol_version: 2,
  hw: {
    // 留空：协议未上报时 SDK 不再用 transport path 伪造身份字段
    serial_no: '',
  },
  fw: {
    app: { version: '0.1.0' },
  },
  bt: {},
  status: {
    init_states: true,
    language: 'en_US',
    passphrase_protection: false,
    bt_enable: true,
  },
});

export async function requestProtocolV2DeviceInfo({
  commands,
  timeoutMs = PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  request = PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
  request?: DevGetDeviceInfo;
}): Promise<ProtocolV2DeviceInfo> {
  if (isProtocolV2DeviceInfoMockEnabled()) {
    return buildMockProtocolV2DeviceInfo();
  }
  const { message } = await commands.typedCall('DevGetDeviceInfo', 'DeviceInfo', request, {
    timeoutMs,
  });
  // 'DeviceInfo' 在生成类型里是 V1 DeviceInfo | ProtocolV2DeviceInfo 的合并；
  // DevGetDeviceInfo 是 V2-only 消息，这里收窄到 V2 形态。
  return message as ProtocolV2DeviceInfo;
}
