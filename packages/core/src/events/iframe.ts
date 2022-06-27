import type { ConnectSettings } from '../types';
import { UI_EVENT } from './ui-request';
import { MessageFactoryFn } from './utils';

export const IFRAME = {
  INIT: 'iframe-init',
  INIT_BRIDGE: 'iframe-init-bridge',
  CALL: 'iframe-call',
  CANCEL: 'iframe-cancel',
} as const;

export interface IFrameInit {
  type: typeof IFRAME.INIT;
  payload: {
    settings: ConnectSettings;
  };
}

export interface IFrameBridge {
  type: typeof IFRAME.INIT_BRIDGE;
  payload: unknown;
}

export type IFrameEvent = IFrameInit | IFrameBridge;
export type IFrameEventMessage = IFrameEvent & { event: typeof UI_EVENT };

export const createIFrameMessage: MessageFactoryFn<typeof UI_EVENT, IFrameEvent> = (
  type,
  payload
) =>
  ({
    event: UI_EVENT,
    type,
    payload,
  } as any);
