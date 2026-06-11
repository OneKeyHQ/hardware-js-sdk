import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS } from '../../protocols/protocol-v2';
import { BaseMethod } from '../BaseMethod';

export type DeviceGetDeviceInfoTargets = {
  hw?: boolean;
  fw?: boolean;
  bt?: boolean;
  se1?: boolean;
  se2?: boolean;
  se3?: boolean;
  se4?: boolean;
  status?: boolean;
};

export type DeviceGetDeviceInfoTypes = {
  version?: boolean;
  build_id?: boolean;
  hash?: boolean;
  specific?: boolean;
};

export type DeviceGetDeviceInfoParams = {
  targets?: DeviceGetDeviceInfoTargets;
  types?: DeviceGetDeviceInfoTypes;
};

const TARGET_KEYS: (keyof DeviceGetDeviceInfoTargets)[] = [
  'hw',
  'fw',
  'bt',
  'se1',
  'se2',
  'se3',
  'se4',
  'status',
];

const TYPE_KEYS: (keyof DeviceGetDeviceInfoTypes)[] = ['version', 'build_id', 'hash', 'specific'];

const DEFAULT_TARGETS: DeviceGetDeviceInfoTargets = {
  hw: true,
  fw: true,
  bt: true,
  status: true,
};

const DEFAULT_TYPES: DeviceGetDeviceInfoTypes = {
  version: true,
  specific: true,
};

function pickBooleanKeys<T extends Record<string, boolean | undefined>>(
  value: unknown,
  keys: (keyof T)[]
): T | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result = {} as T;
  let hasKey = false;
  for (const key of keys) {
    if (source[key as string]) {
      result[key] = true as T[keyof T];
      hasKey = true;
    }
  }
  return hasKey ? result : undefined;
}

/**
 * 原生 DevGetDeviceInfo（Protocol V2 only）。
 *
 * 与 getDeviceInfo 不同：不构建 DeviceProfile、不更新设备缓存，
 * 按调用方给定的 targets/types 原样请求并返回未加工的 DeviceInfo 消息，
 * 用于调试固件字段上报。
 */
export default class DeviceGetDeviceInfo extends BaseMethod<{
  targets: DeviceGetDeviceInfoTargets;
  types: DeviceGetDeviceInfoTypes;
}> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      targets:
        pickBooleanKeys<DeviceGetDeviceInfoTargets>(this.payload.targets, TARGET_KEYS) ??
        DEFAULT_TARGETS,
      types:
        pickBooleanKeys<DeviceGetDeviceInfoTypes>(this.payload.types, TYPE_KEYS) ?? DEFAULT_TYPES,
    };
  }

  async run() {
    if (!this.device.isProtocolV2()) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }

    const res = await this.device.commands.typedCall(
      'DeviceGetDeviceInfo',
      'DeviceInfo',
      {
        targets: this.params.targets,
        types: this.params.types,
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
    return Promise.resolve(res.message);
  }
}
