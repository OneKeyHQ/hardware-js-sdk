import { UI_EVENT } from './ui-request';
import type { MessageFactoryFn } from './utils';

export const UI_RESPONSE = {
  RECEIVE_PIN: 'ui-receive_pin',
  RECEIVE_PASSPHRASE: 'ui-receive_passphrase',
  SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE:
    'ui-receive_select-device-in-bootloader-for-web-device',
} as const;

export interface UiResponsePin {
  type: typeof UI_RESPONSE.RECEIVE_PIN;
  payload: string;
}

export interface UiResponsePassphrase {
  type: typeof UI_RESPONSE.RECEIVE_PASSPHRASE;
  payload: {
    value: string;
    passphraseOnDevice?: boolean;
    attachPinOnDevice?: boolean;
    save?: boolean;
  };
}

export interface UiResponseSelectDeviceInBootloaderForWebDevice {
  type: typeof UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE;
  payload: {
    deviceId: string;
  };
}

export type UiResponseEvent =
  | UiResponsePin
  | UiResponsePassphrase
  | UiResponseSelectDeviceInBootloaderForWebDevice;

export type UiResponseMessage = UiResponseEvent & { event: typeof UI_EVENT };

export const createUiResponse: MessageFactoryFn<typeof UI_EVENT, UiResponseEvent> = (
  type,
  payload
) =>
  ({
    event: UI_EVENT,
    type,
    payload,
  } as any);
