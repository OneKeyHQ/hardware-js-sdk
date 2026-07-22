import type { MessageFactoryFn } from './utils';
import type { PROTO } from '../constants';
import type {
  KnownDevice as Device,
  DeviceStateEvent,
  Features,
  SupportFeatures,
} from '../types/device';

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
  ATTACH_PIN_ON_DEVICE: 'attach_pin_on_device',
  WORD: 'word',
  SUPPORT_FEATURES: 'support_features',
  SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE: 'select_device_in_bootloader_for_web_device',
  SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE: 'select_device_for_switch_firmware_web_device',

  FEATURES: 'features',
  STATE: 'state',
} as const;

export interface DeviceConnnectRequest {
  type: typeof DEVICE.CONNECT;
  payload: { device: Device };
}

export interface DeviceDisconnnectRequest {
  type: typeof DEVICE.DISCONNECT;
  payload: { device: Device };
}

export interface DeviceButtonRequestPayload extends Omit<PROTO.ButtonRequest, 'code'> {
  code?: PROTO.ButtonRequest['code'] | 'ButtonRequest_FirmwareUpdate';
}

export type PassphraseRequestPayload = {
  existsAttachPinUser?: boolean;
  source?: 'wallet-session-coordinator';
  reason?: 'open-wallet' | 'session-recovery';
  expectedPassphraseState?: string;
};

export interface DeviceButtonRequest {
  type: typeof DEVICE.BUTTON;
  payload: DeviceButtonRequestPayload & { device: Device | null };
}

export type DeviceFeaturesPayload = Features;

export interface DeviceSendFeatures {
  type: typeof DEVICE.FEATURES;
  payload: DeviceFeaturesPayload;
}

export interface DeviceSendState {
  type: typeof DEVICE.STATE;
  payload: DeviceStateEvent;
}

export type DeviceSupportFeaturesPayload = SupportFeatures & { device: Device | null };
export interface DeviceSendSupportFeatures {
  type: typeof DEVICE.SUPPORT_FEATURES;
  payload: DeviceSupportFeaturesPayload;
}

export type DeviceEvent =
  | DeviceButtonRequest
  | DeviceSendState
  | DeviceSendFeatures
  | DeviceSendSupportFeatures
  | DeviceDisconnnectRequest
  | DeviceConnnectRequest;

export type DeviceEventMessage = DeviceEvent & { event: typeof DEVICE_EVENT };

export type DeviceEventListenerFn = (
  type: typeof DEVICE_EVENT,
  cb: (event: DeviceEventMessage) => void
) => void;

export const createDeviceMessage: MessageFactoryFn<typeof DEVICE_EVENT, DeviceEvent> = (
  type,
  payload
) =>
  ({
    event: DEVICE_EVENT,
    type,
    payload,
  } as any);
