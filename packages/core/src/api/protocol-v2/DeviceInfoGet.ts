import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS } from '../../protocols/protocol-v2';
import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';

export type DeviceInfoGetTargets = {
  hw?: boolean;
  fw?: boolean;
  coprocessor?: boolean;
  se1?: boolean;
  se2?: boolean;
  se3?: boolean;
  se4?: boolean;
};

export type DeviceInfoGetTypes = {
  version?: boolean;
  build_id?: boolean;
  hash?: boolean;
  specific?: boolean;
};

export type DeviceInfoGetParams = {
  targets?: DeviceInfoGetTargets;
  types?: DeviceInfoGetTypes;
};

const TARGET_KEYS: (keyof DeviceInfoGetTargets)[] = [
  'hw',
  'fw',
  'coprocessor',
  'se1',
  'se2',
  'se3',
  'se4',
];

const TYPE_KEYS: (keyof DeviceInfoGetTypes)[] = ['version', 'build_id', 'hash', 'specific'];

const DEFAULT_TARGETS: DeviceInfoGetTargets = {
  hw: true,
  fw: true,
  coprocessor: true,
};

const DEFAULT_TYPES: DeviceInfoGetTypes = {
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

function assertKnownKeys(value: unknown, keys: string[], name: string) {
  if (value == null) return;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw invalidParameter(`Parameter [${name}] must be an object.`);
  }
  const allowed = new Set(keys);
  const unknownKeys = Object.keys(value).filter(key => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw invalidParameter(
      `Parameter [${name}] contains unsupported key(s): ${unknownKeys.join(', ')}.`
    );
  }
}

function normalizeTargets(value: unknown): DeviceInfoGetTargets | undefined {
  assertKnownKeys(
    value,
    TARGET_KEYS.map(key => String(key)),
    'targets'
  );
  return pickBooleanKeys<DeviceInfoGetTargets>(value, TARGET_KEYS);
}

function normalizeTypes(value: unknown): DeviceInfoGetTypes | undefined {
  assertKnownKeys(
    value,
    TYPE_KEYS.map(key => String(key)),
    'types'
  );
  return pickBooleanKeys<DeviceInfoGetTypes>(value, TYPE_KEYS);
}

/**
 * 原生 DeviceInfoGet（Protocol V2 only）。
 *
 * SDK 内部按需构造 targets/types，并返回未加工的 DeviceInfo 消息。
 * 该 command 不属于公共 CoreApi；业务接入统一使用 getDeviceState。
 */
export default class DeviceInfoGet extends BaseMethod<{
  targets: DeviceInfoGetTargets;
  types: DeviceInfoGetTypes;
}> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      targets: normalizeTargets(this.payload.targets) ?? DEFAULT_TARGETS,
      types: normalizeTypes(this.payload.types) ?? DEFAULT_TYPES,
    };
  }

  async run() {
    if (!this.device.isProtocolV2()) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }

    const res = await this.device.commands.typedCall(
      'DeviceInfoGet',
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
