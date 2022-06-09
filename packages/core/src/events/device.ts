import type { PROTO } from '../constants';
import type { KnownDevice } from '../types';
import { MessageFactoryFn } from './utils';

export const DEVICE_EVENT = 'DEVICE_EVENT';
export const DEVICE = {
  // device list events
  CONNECT: 'device-connect',
  CONNECT_UNACQUIRED: 'device-connect_unacquired',
  DISCONNECT: 'device-disconnect',
  CHANGED: 'device-changed',
  ACQUIRE: 'device-acquire',
  RELEASE: 'device-release',
  ACQUIRED: 'device-acquired',
  RELEASED: 'device-released',
  USED_ELSEWHERE: 'device-used_elsewhere',
  UNREADABLE: 'unreadable-device',

  LOADING: 'device-loading',

  // onekey-transport events in protobuf format
  BUTTON: 'button',
  PIN: 'pin',
  PASSPHRASE: 'passphrase',
  PASSPHRASE_ON_DEVICE: 'passphrase_on_device',
  WORD: 'word',
} as const;

export interface DeviceButtonRequestPayload extends Omit<PROTO.ButtonRequest, 'code'> {
  code?: PROTO.ButtonRequest['code'] | 'ButtonRequest_FirmwareUpdate';
}

export interface DeviceButtonRequest {
  type: typeof DEVICE.BUTTON;
  payload: DeviceButtonRequestPayload & { device: KnownDevice };
}

export type DeviceEvent = DeviceButtonRequest;

export type DeviceEventMessage = DeviceEvent & { event: typeof DEVICE_EVENT };

export const createDeviceMessage: MessageFactoryFn<typeof DEVICE_EVENT, DeviceEvent> = (
  type,
  payload
) =>
  ({
    event: DEVICE_EVENT,
    type,
    payload,
  } as any);
