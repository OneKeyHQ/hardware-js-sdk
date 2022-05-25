import type { ConnectSettings } from '../types';
import { UI_EVENT } from './ui-request';

export const IFRAME = {
  INIT: 'iframe-init',
  INIT_BRIDGE: 'iframe-init-bridge',
  CALL: 'iframe-call',
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

export interface IFrameCall {
  type: typeof IFRAME.CALL;
  payload: any;
}

export type IFrameEvent = IFrameInit | IFrameBridge | IFrameCall;
export type IFrameEventMessage = IFrameEvent & { event: typeof UI_EVENT };
