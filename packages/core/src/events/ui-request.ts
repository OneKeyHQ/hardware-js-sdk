import type { PROTO } from '../constants';
import type { Device } from '../types';
import type { DeviceButtonRequest } from './device';
import type { MessageFactoryFn } from './utils';

export const UI_EVENT = 'UI_EVENT';

export const UI_REQUEST = {
  REQUEST_PIN: 'ui-request_pin',
  INVALID_PIN: 'ui-invalid_pin',
  REQUEST_BUTTON: 'ui-button',

  CLOSE_UI_WINDOW: 'ui-close_window',

  BLUETOOTH_PERMISSION: 'ui-bluetooth_permission',
} as const;

export interface UiRequestWithoutPayload {
  type: typeof UI_REQUEST.CLOSE_UI_WINDOW | typeof UI_REQUEST.BLUETOOTH_PERMISSION;
  payload?: typeof undefined;
}

export type UiRequestDeviceAction = {
  type: typeof UI_REQUEST.REQUEST_PIN;
  payload: {
    device: Device;
    type?: PROTO.PinMatrixRequestType;
  };
};

export interface UiRequestButton {
  type: typeof UI_REQUEST.REQUEST_BUTTON;
  payload: DeviceButtonRequest['payload'];
}

export type UiEvent = UiRequestWithoutPayload | UiRequestDeviceAction | UiRequestButton;

export type UiEventMessage = UiEvent & { event: typeof UI_EVENT };

export const createUiMessage: MessageFactoryFn<typeof UI_EVENT, UiEvent> = (type, payload) =>
  ({
    event: UI_EVENT,
    type,
    payload,
  } as any);
