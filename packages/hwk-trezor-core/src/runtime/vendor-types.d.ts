/*
 * `thp` is declared as both a namespace (type side) and a const (value side),
 * which is valid TypeScript declaration merging but trips eslint-plugin-import's
 * "Multiple exports of name" check.
 */
/* eslint-disable import/export */
declare module '@onekeyfe/hwk-trezor-protobuf' {
  export namespace MessagesSchema {
    export type MessageKey = string;
    export type MessageResponse = {
      type: string;
      message: Record<string, unknown>;
    };
  }

  export const protobufManager: {
    load(modules: unknown): void;
    encode(
      name: string,
      data: Record<string, unknown>
    ): {
      messageType: number;
      message: Buffer;
    };
    decode(messageType: number, data: Buffer | Uint8Array): MessagesSchema.MessageResponse;
  };
}

declare module '@onekeyfe/hwk-trezor-protobuf/hwk' {
  export const DefaultDefinitions: unknown[];
}

declare module '@onekeyfe/hwk-trezor-protocol' {
  export type TransportProtocol = {
    name: 'bridge' | 'v1' | 'v2';
    encode(data: Buffer, options: { messageType: number; header?: Buffer }): Buffer;
    decode(bytes: Buffer): {
      header: Buffer;
      length: number;
      messageType: number;
      payload: Buffer;
    };
    getHeaders(data: Buffer): [header: Buffer, chunkHeader: Buffer];
  };

  export class ThpState {
    [key: string]: any;

    readonly sendNonce?: number;

    constructor(...args: any[]);

    setChannel(channel: Buffer): void;

    sync(direction: 'send' | 'recv', messageName: string): void;
  }

  export namespace thp {
    export type ThpCredentials = any;
    export type ThpDeviceProperties = any;
    export type ThpHandshakeInitResponse = any;
  }

  export const v1: TransportProtocol;
  export const v2: TransportProtocol;
  export const thp: {
    [key: string]: any;
    ThpState: typeof ThpState;
    encode(params: {
      messageName: string;
      data: Record<string, unknown>;
      thpState: ThpState;
      protobufEncoder: (
        name: string,
        data: Record<string, unknown>
      ) => { messageType: number; message: Buffer };
    }): Buffer;
  };
}

declare module '@onekeyfe/hwk-trezor-transport/hwk' {
  import type { MessagesSchema } from '@onekeyfe/hwk-trezor-protobuf';
  import type { ThpState, TransportProtocol } from '@onekeyfe/hwk-trezor-protocol';

  export const buildMessage: (params: {
    name: string;
    data: Record<string, unknown>;
    protocol: TransportProtocol;
    thpState?: ThpState;
  }) => Buffer;

  export const createChunks: (data: Buffer, chunkHeader: Buffer, chunkSize: number) => Buffer[];

  export const receive: (
    receiver: () => Promise<{ success: true; payload: Buffer } | { success: false; error: any }>,
    protocol: TransportProtocol
  ) => Promise<
    | {
        success: true;
        payload: {
          header: Buffer;
          length: number;
          messageType: number;
          payload: Buffer;
        };
      }
    | { success: false; error: any }
  >;

  export const callThpMessage: (params: {
    thpState?: ThpState;
    chunks: Buffer[];
    skipAck?: boolean;
    apiWrite: (
      chunk: Buffer,
      signal?: AbortSignal
    ) => Promise<{ success: true; payload: undefined } | { success: false; error: any }>;
    apiRead: (
      signal?: AbortSignal
    ) => Promise<{ success: true; payload: Buffer } | { success: false; error: any }>;
    signal?: AbortSignal;
    logger?: any;
  }) => Promise<{ success: true; payload: any } | { success: false; error: any }>;

  export const parseThpMessage: (params: {
    decoded: any;
    thpState?: ThpState;
  }) => MessagesSchema.MessageResponse;

  export const receiveAndParse: (
    receiver: () => Promise<{ success: true; payload: Buffer } | { success: false; error: any }>,
    protocol: TransportProtocol
  ) => Promise<
    { success: true; payload: MessagesSchema.MessageResponse } | { success: false; error: any }
  >;
}
