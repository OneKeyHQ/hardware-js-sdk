import type { ConnectSettings } from '../types';
import { UI_EVENT } from './ui-request';

export const IFRAME = {
  INIT: 'iframe-init',
  INIT_BRIDGE: 'iframe-init-bridge',
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

export type BridgePayload = {
  type: string;
  params: Record<string, any>;
};

export type BridgeMessage = {
  id?: number;
  data?: BridgePayload;
  error?: unknown;
};

export type IFrameEvent = IFrameInit | IFrameBridge;
export type IFrameEventMessage = IFrameEvent & { event: typeof UI_EVENT };
