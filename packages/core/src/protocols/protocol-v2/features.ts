import { DeviceSEState, DeviceSeType } from '@onekeyfe/hd-transport';

import type {
  DeviceInfoGet,
  DeviceSEInfo,
  DeviceStatus,
  ProtocolInfo,
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

export type ProtocolV2RuntimeMode = 'normal' | 'bootloader' | 'romloader';

/**
 * Protocol V2 fingerprints use:
 * <binary>__<version>__<commit>__<PROD|DEV>__<DEBUG|RELEASE>
 */
export type ProtocolV2BuildFingerprint = {
  binary: 'application' | 'bootloader' | 'romloader';
  version: string;
  commit: string;
  environment: 'PROD' | 'DEV';
  buildType: 'DEBUG' | 'RELEASE';
};

export const parseProtocolV2BuildFingerprint = (
  buildFingerprint: string | null | undefined
): ProtocolV2BuildFingerprint | null => {
  if (!buildFingerprint) return null;
  const [binary, version, commit, environment, buildType, ...extra] = buildFingerprint.split('__');
  if (
    extra.length > 0 ||
    (binary !== 'application' && binary !== 'bootloader' && binary !== 'romloader') ||
    !version ||
    !commit ||
    (environment !== 'PROD' && environment !== 'DEV') ||
    (buildType !== 'DEBUG' && buildType !== 'RELEASE')
  ) {
    return null;
  }
  return { binary, version, commit, environment, buildType };
};

export const getProtocolV2RuntimeMode = (
  protocolInfo: ProtocolInfo
): ProtocolV2RuntimeMode | undefined => {
  const binary = parseProtocolV2BuildFingerprint(protocolInfo.build_fingerprint)?.binary;
  if (binary === 'application') return 'normal';
  return binary;
};

// MessageType_DeviceStatusGet in the Protocol V2 protobuf registry.
export const PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE = 60602;

export const supportsProtocolV2Message = (
  protocolInfo: ProtocolInfo,
  messageType: number
): boolean => protocolInfo.supported_messages.includes(messageType);

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

export async function requestProtocolV2ProtocolInfo({
  commands,
  timeoutMs,
}: {
  commands: DeviceCommands;
  timeoutMs?: number;
}): Promise<ProtocolInfo> {
  const response =
    timeoutMs === undefined
      ? await commands.typedCall('ProtocolInfoRequest', 'ProtocolInfo', {
          eventless_wallet_session: true,
        })
      : await commands.typedCall(
          'ProtocolInfoRequest',
          'ProtocolInfo',
          { eventless_wallet_session: true },
          { timeoutMs }
        );
  return response.message;
}

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
