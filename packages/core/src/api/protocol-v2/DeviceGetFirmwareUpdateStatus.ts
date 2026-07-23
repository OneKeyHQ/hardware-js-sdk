import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';

import type { DeviceFirmwareUpdateStatusGetParams } from './helpers';
import type { DeviceFirmwareUpdateRecordFields } from '@onekeyfe/hd-transport';

const DEVICE_FIRMWARE_UPDATE_STATUS_FIELDS = ['status', 'payload_version', 'path'] as const;

function normalizeStatusFields(
  fields: DeviceFirmwareUpdateStatusGetParams['fields']
): DeviceFirmwareUpdateRecordFields | undefined {
  if (fields === undefined || fields === null) return undefined;
  if (typeof fields !== 'object' || Array.isArray(fields)) {
    throw invalidParameter('Parameter [fields] must be an object.');
  }

  const unknownField = Object.keys(fields).find(
    field => !DEVICE_FIRMWARE_UPDATE_STATUS_FIELDS.includes(field as any)
  );
  if (unknownField) {
    throw invalidParameter(`Unsupported firmware update status field: ${unknownField}`);
  }

  const normalized: DeviceFirmwareUpdateRecordFields = {};
  for (const field of DEVICE_FIRMWARE_UPDATE_STATUS_FIELDS) {
    const value = fields[field];
    if (value === undefined) continue;
    if (typeof value !== 'boolean') {
      throw invalidParameter(`Parameter [fields.${field}] must be a boolean.`);
    }
    normalized[field] = value;
  }
  return normalized;
}

export default class DeviceGetFirmwareUpdateStatus extends BaseMethod<DeviceFirmwareUpdateStatusGetParams> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    const fields = normalizeStatusFields(this.payload.fields);
    this.params = fields ? { fields } : {};
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatus',
      this.params
    );
    return Promise.resolve(res.message);
  }
}
