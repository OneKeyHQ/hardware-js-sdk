// Ambient types for `@onekeyfe/hwk-trezor-protobuf`.
//
// That package doesn't currently ship its own `.d.ts` (its tsup dts build can't
// resolve the `@trezor/*` source aliases), so importing it from source code
// otherwise resolves to `any` and trips noImplicitAny. We only use the encode /
// decode surface here, so declare exactly that.
declare module '@onekeyfe/hwk-trezor-protobuf' {
  export interface ProtobufEncodeResult {
    messageType: number;
    message: Buffer;
  }
  export interface ProtobufDecodeResult {
    type: string;
    message: Record<string, unknown>;
  }
  export interface ProtobufManagerInstance {
    load(definitions: unknown): void;
    encode(name: string, data: Record<string, unknown>): ProtobufEncodeResult;
    decode(type: string | number, data: Buffer | Uint8Array): ProtobufDecodeResult;
    findSchema(nameOrId: string | number): {
      schema: unknown;
      messageType: number;
      messageName: string;
    };
  }
  export const protobufManager: ProtobufManagerInstance;
  export function ProtobufManager(): ProtobufManagerInstance;
}
