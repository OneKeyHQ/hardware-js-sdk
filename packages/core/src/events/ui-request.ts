import type { PROTO } from '../constants';
import type { Device } from '../types';
import type { MessageFactoryFn } from './utils';

export const UI_EVENT = 'UI_EVENT';

export const UI_REQUEST = {
  REQUEST_PIN: 'ui-request_pin',
} as const;

export type UiRequestDeviceAction = {
  type: typeof UI_REQUEST.REQUEST_PIN;
  payload: {
    device: Device;
    type?: PROTO.PinMatrixRequestType;
  };
};

export type UiEvent = UiRequestDeviceAction;

export const createUiMessage: MessageFactoryFn<typeof UI_EVENT, UiEvent> = (type, payload) =>
  ({
    event: UI_EVENT,
    type,
    payload,
  } as any);
