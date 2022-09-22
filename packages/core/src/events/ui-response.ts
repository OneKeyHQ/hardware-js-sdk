import { UI_EVENT } from './ui-request';
import type { MessageFactoryFn } from './utils';

export const UI_RESPONSE = {
  RECEIVE_PIN: 'ui-receive_pin',
  RECEIVE_PASSPHRASE: 'ui-receive_passphrase',
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
    save?: boolean;
  };
}

export type UiResponseEvent = UiResponsePin | UiResponsePassphrase;

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
