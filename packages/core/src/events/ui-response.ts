import { UI_EVENT } from './ui-request';
import type { MessageFactoryFn } from './utils';

export const UI_RESPONSE = {
  RECEIVE_PIN: 'ui-receive_pin',
} as const;

export interface UiResponsePin {
  type: typeof UI_RESPONSE.RECEIVE_PIN;
  payload: string;
}

export type UiResponseEvent = UiResponsePin;

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
