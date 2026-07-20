import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';

import type {
  DeviceAttachPinOnDevice,
  DeviceHostPassphrase,
  DevicePassphraseOnDevice,
  DeviceSessionResume,
} from '@onekeyfe/hd-transport';

type HiddenWalletSelection =
  | {
      host_passphrase: DeviceHostPassphrase;
      passphrase_on_device?: never;
      attach_pin_on_device?: never;
    }
  | {
      host_passphrase?: never;
      passphrase_on_device: DevicePassphraseOnDevice;
      attach_pin_on_device?: never;
    }
  | {
      host_passphrase?: never;
      passphrase_on_device?: never;
      attach_pin_on_device: DeviceAttachPinOnDevice;
    };

export type DeviceSessionOpenParams =
  | { resume: DeviceSessionResume; select?: never }
  | { resume?: never; select: HiddenWalletSelection };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeParams = (payload: Record<string, unknown>): DeviceSessionOpenParams => {
  const hasResume = payload.resume !== undefined;
  const hasSelect = payload.select !== undefined;
  if (hasResume === hasSelect) {
    throw invalidParameter('DeviceSessionOpen requires exactly one of [resume] or [select].');
  }

  if (hasResume) {
    if (!isRecord(payload.resume) || typeof payload.resume.session_id !== 'string') {
      throw invalidParameter('Parameter [resume.session_id] must be a non-empty string.');
    }
    const sessionId = payload.resume.session_id.trim();
    if (!sessionId) {
      throw invalidParameter('Parameter [resume.session_id] must be a non-empty string.');
    }
    return { resume: { session_id: sessionId } };
  }

  if (!isRecord(payload.select)) {
    throw invalidParameter('Parameter [select] must be a hidden-wallet selection object.');
  }
  const accessKeys = ['host_passphrase', 'passphrase_on_device', 'attach_pin_on_device'] as const;
  const selected = accessKeys.filter(key => payload.select?.[key] !== undefined);
  const unknown = Object.keys(payload.select).filter(
    key => !accessKeys.includes(key as (typeof accessKeys)[number])
  );
  if (unknown.length > 0 || selected.length !== 1) {
    throw invalidParameter('Parameter [select] requires exactly one hidden-wallet access mode.');
  }

  if (selected[0] === 'host_passphrase') {
    const host = payload.select.host_passphrase;
    if (!isRecord(host) || typeof host.passphrase !== 'string') {
      throw invalidParameter('Parameter [select.host_passphrase.passphrase] is required.');
    }
    const passphrase = host.passphrase.normalize('NFKD');
    if (!passphrase || passphrase.includes('\0') || passphrase.length > 50) {
      throw invalidParameter('Parameter [select.host_passphrase.passphrase] is invalid.');
    }
    return { select: { host_passphrase: { passphrase } } };
  }

  return { select: { [selected[0]]: {} } } as DeviceSessionOpenParams;
};

export default class DeviceSessionOpen extends BaseMethod<DeviceSessionOpenParams> {
  init() {
    this.requireProtocolV2 = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = normalizeParams(this.payload as unknown as Record<string, unknown>);
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'DeviceSessionOpen',
      'DeviceSession',
      this.params
    );
    return message;
  }
}
