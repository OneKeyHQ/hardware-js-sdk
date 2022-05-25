const IFRAME = {
  INIT: 'iframe-init',
  INIT_BRIDGE: 'iframe-init-bridge',
} as const;

export type BridgePayload = {
  type: string;
  params: Record<string, any>;
};

export type BridgeMessage = {
  id?: number;
  data?: BridgePayload;
  error?: unknown;
};

export { IFRAME };
