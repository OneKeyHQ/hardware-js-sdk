import type { DeviceCommands } from '../../device/DeviceCommands';

export type ProtocolV2Bytes = Uint8Array | number[] | string;

export type ProtocolV2FirmwareImageInfo = {
  version?: string;
  build_id?: string;
  hash?: ProtocolV2Bytes;
};

export type ProtocolV2SEInfo = {
  boot?: ProtocolV2FirmwareImageInfo;
  app?: ProtocolV2FirmwareImageInfo;
  type?: number;
  state?: number;
};

export type ProtocolV2DeviceInfo = {
  protocol_version?: number;
  hw?: {
    Device_type?: number;
    device_type?: number;
    serial_no?: string;
    hardware_version?: string;
    hardware_version_raw_adc?: number;
  };
  fw?: {
    board?: ProtocolV2FirmwareImageInfo;
    boot?: ProtocolV2FirmwareImageInfo;
    app?: ProtocolV2FirmwareImageInfo;
  };
  bt?: {
    boot?: ProtocolV2FirmwareImageInfo;
    app?: ProtocolV2FirmwareImageInfo;
    adv_name?: string;
    mac?: ProtocolV2Bytes;
  };
  se1?: ProtocolV2SEInfo;
  se2?: ProtocolV2SEInfo;
  se3?: ProtocolV2SEInfo;
  se4?: ProtocolV2SEInfo;
  status?: {
    language?: string;
    bt_enable?: boolean;
    init_states?: boolean;
    backup_required?: boolean;
    passphrase_protection?: boolean;
    label?: string;
  };
};

export type ProtocolV2SeStateLabel = 'BOOT' | 'APP_FACTORY' | 'APP';

/**
 * DevSEInfo.state → 可读标签。SDK 内唯一的 SE 状态映射实现，
 * deviceProfile 与 legacy Features 兼容视图都从这里取。
 */
export const getProtocolV2SeState = (se?: ProtocolV2SEInfo): ProtocolV2SeStateLabel | null => {
  switch (se?.state) {
    case 0:
      return 'BOOT';
    case 51:
      return 'APP_FACTORY';
    case 85:
      return 'APP';
    default:
      return null;
  }
};

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
  request?: object;
}): Promise<ProtocolV2DeviceInfo> {
  const { message } = await commands.typedCall('DevGetDeviceInfo', 'DeviceInfo', request, {
    timeoutMs,
  });
  return message as unknown as ProtocolV2DeviceInfo;
}
