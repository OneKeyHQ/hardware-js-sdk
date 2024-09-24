export declare enum IJsBridgeMessageTypes {
  RESPONSE = 'RESPONSE',
  REQUEST = 'REQUEST',
}
export type IJsBridgeMessageTypesStrings = keyof typeof IJsBridgeMessageTypes;

export type IJsonRpcRequest = {
  id?: number | string;
  jsonrpc?: '2.0' | '1.0';
  method: string;
  params?: Record<string, unknown> | Array<unknown> | unknown;
};
export type IJsonRpcResponse<T> = {
  id?: number | string;
  jsonrpc: string;
  result: any | unknown | T;
};
export type IJsBridgeCallback = {
  id: number;
  resolve: (value: unknown) => void;
  reject: (value: unknown) => void;
  created: number;
};

export type IJsBridgeMessagePayload = {
  id?: number;
  data?: unknown | IJsonRpcRequest;
  error?: unknown;
  remoteId?: number | string | null;
  type?: IJsBridgeMessageTypesStrings;
  origin?: string;
  peerOrigin?: string;
  resolve?: (value: unknown) => void;
  reject?: (value: unknown) => void;
  created?: number;
  sync?: boolean;
  internal?: boolean;
  isWalletConnectRequest?: boolean;
};

export type IJsBridgeReceiveHandler = (
  payload: IJsBridgeMessagePayload,
  bridge?: any,
) => any | Promise<any>;

import type { JsBridgeBase } from '@onekeyfe/cross-inpage-provider-core';

class WebEmbedApiProxy {
  webEmbedBridge: JsBridgeBase | null = null;

  connectWebEmbedBridge(bridge: JsBridgeBase) {
    this.webEmbedBridge = bridge;
  }

  async _bridgeReceiveHandler(payload: IJsBridgeMessagePayload): Promise<any> {
    const { origin, internal } = payload;
    const request = (payload.data ?? {}) as IJsonRpcRequest;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { method, params } = request;

    if (!origin) {
      throw new Error('BackgroundApi [payload.origin] is required.');
    }

    if (!internal) {
      throw new Error('BackgroundApi [payload.scope] is required for non-internal method call.');
    }

    return this.handleSelfOriginMethods(payload);
  }

  bridgeReceiveHandler: IJsBridgeReceiveHandler = async (
    payload: IJsBridgeMessagePayload,
  ): Promise<any> => {
    const res = await this._bridgeReceiveHandler(payload);
    return res;
  };
}

export const webEmbedApiProxy = new WebEmbedApiProxy();
