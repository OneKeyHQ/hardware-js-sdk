import type { ConnectSettings } from '../types';
import { UI_EVENT } from './ui-request';
import { MessageFactoryFn } from './utils';

export const IFRAME = {
  INIT: 'iframe-init',
  INIT_BRIDGE: 'iframe-init-bridge',
  CALL: 'iframe-call',
  CANCEL: 'iframe-cancel',
  SWITCH_TRANSPORT: 'iframe-switch-transport',
  CALLBACK: 'iframe-callback',
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

export interface IFrameSwitchTransport {
  type: typeof IFRAME.SWITCH_TRANSPORT;
  payload: {
    env: ConnectSettings['env'];
  };
}

export interface IFrameCallback {
  type: typeof IFRAME.CALLBACK;
  payload: {
    callbackId: string;
    data?: any;
    error?: any;
    finished?: boolean;
  };
}

export type IFrameEvent = IFrameInit | IFrameBridge | IFrameSwitchTransport | IFrameCallback;
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
