import { DeviceSEState, DeviceSeType } from '@onekeyfe/hd-transport';

import type {
  DeviceInfoGet,
  DeviceSEInfo,
  DeviceStatus,
  ProtocolV2DeviceInfo,
} from '@onekeyfe/hd-transport';
import type { DeviceCommands } from '../../device/DeviceCommands';

// Use hd-transport generated Protocol V2 types as the single source of truth.
export type { ProtocolV2DeviceInfo };
export type { DeviceFirmwareImageInfo as ProtocolV2FirmwareImageInfo } from '@onekeyfe/hd-transport';
export type { DeviceSEInfo as ProtocolV2SEInfo } from '@onekeyfe/hd-transport';

export type ProtocolV2SeStateLabel = 'BOOT' | 'APP_FACTORY' | 'APP';

/**
 * The transport historically decodes scalar proto enums as name strings.
 * Accept both that SDK representation and numeric enums for low-level callers.
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
 * Map DeviceSEInfo.state to a readable label. This is the SDK's canonical mapping
 * used by DeviceState and the legacy Features projection.
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
 * Map DeviceSEInfo.type to a readable label such as `THD89`.
 */
export const getProtocolV2SeType = (se?: DeviceSEInfo): string | null =>
  normalizeEnumValue(DeviceSeType, se?.type);

export type ProtocolV2RuntimeMode = 'normal' | 'bootloader';

/**
 * TODO: Once firmware-pro2 exposes ProtocolInfo.build_fingerprint, parse the running
 * binary name and remove the temporary DeviceStatusGet-failure heuristic. romloader
 * is a separate recovery flow and is excluded until its contract is defined.
 *
 * The temporary contract has two states: DeviceStatusGet success means normal and
 * failure means bootloader. Do not infer mode from application/SE/romloader fields.
 */
export const getProtocolV2RuntimeMode = ({
  deviceInfo: _deviceInfo,
  deviceStatusAvailable,
}: {
  deviceInfo?: ProtocolV2DeviceInfo | null;
  deviceStatusAvailable: boolean;
}): ProtocolV2RuntimeMode => {
  if (deviceStatusAvailable) return 'normal';
  return 'bootloader';
};

export const PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST = {
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

/**
 * Version probe used after firmware update completion.
 * It reads hardware and firmware component data without requesting DeviceStatus.
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
  // Generated DeviceInfo is a V1/V2 union; DeviceInfoGet narrows it to the V2 shape.
  return message as ProtocolV2DeviceInfo;
}

export async function requestProtocolV2DeviceStatus({
  commands,
  timeoutMs,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
}): Promise<DeviceStatus> {
  const response =
    timeoutMs === undefined
      ? await commands.typedCall('DeviceStatusGet', 'DeviceStatus', {})
      : await commands.typedCall('DeviceStatusGet', 'DeviceStatus', {}, { timeoutMs });
  const { message } = response;
  return message;
}
